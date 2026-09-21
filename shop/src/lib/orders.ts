import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { OrderStatus, PaymentProvider, Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import { appUrl } from "./env";
import { includedTax, formatEUR } from "./money";
import { getSettings } from "./settings";
import { shippingCost, type ShippingMethodId } from "./shipping";
import { evaluateCoupon } from "./coupons";
import { customerRedemptions, loadCoupon } from "./cart";
import { ensureInvoice } from "./invoice";
import { notify } from "./notify";
import { mails } from "./mail";
import { stripe } from "./stripe";
import { refundPayPalCapture } from "./paypal";
import type { AddressInput } from "./validation";

// ───────────────────────── Status-Modell ─────────────────────────

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Neu",
  PAID: "Bezahlt",
  PROCESSING: "In Bearbeitung",
  SHIPPED: "Versendet",
  DELIVERED: "Zugestellt",
  CANCELLED: "Storniert",
  REFUNDED: "Erstattet",
};

/** Kundensicht: Bestellt → Bearbeitet → Versendet → Zugestellt */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Bestellt",
  PAID: "Bestellt",
  PROCESSING: "Bearbeitet",
  SHIPPED: "Versendet",
  DELIVERED: "Zugestellt",
  CANCELLED: "Storniert",
  REFUNDED: "Erstattet",
};

export const CUSTOMER_STEPS = ["Bestellt", "Bearbeitet", "Versendet", "Zugestellt"] as const;
export const customerStepIndex = (s: OrderStatus) =>
  s === "NEW" || s === "PAID" ? 0 : s === "PROCESSING" ? 1 : s === "SHIPPED" ? 2 : s === "DELIVERED" ? 3 : -1;

export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const newGuestToken = () => randomBytes(24).toString("base64url");

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const row = await tx.sequence.upsert({
    where: { name: "order" },
    update: { value: { increment: 1 } },
    create: { name: "order", value: 100001 },
  });
  return row.value;
}

// ───────────────────────── Bestellung anlegen ─────────────────────────

export type CreateOrderInput = {
  cartId: string;
  userId: string | null;
  email: string;
  shipping: AddressInput;
  billing?: AddressInput;
  shippingMethod: ShippingMethodId;
  provider: PaymentProvider;
  note?: string;
};

const clean = (a: AddressInput) => ({
  firstName: a.firstName, lastName: a.lastName, company: a.company || null, line1: a.line1,
  line2: a.line2 || null, postalCode: a.postalCode, city: a.city, country: a.country, phone: a.phone || null,
});

/**
 * Legt die Bestellung serverseitig an. Preise, Rabatt, Versand und Summen werden hier NEU berechnet –
 * der Client liefert nur Auswahl (Adresse, Versandart, Zahlart). Der Bestand wird atomar reserviert.
 */
export async function createOrderFromCart(input: CreateOrderInput) {
  const settings = await getSettings();
  await releaseExpiredOrders();

  const order = await db.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { id: input.cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: { include: { images: { orderBy: { position: "asc" } } } },
              },
            },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) throw new ApiError(400, "Dein Warenkorb ist leer.", "empty_cart");

    // Frühere, unbezahlte Bestellungen aus demselben Warenkorb freigeben (Zahlung abgebrochen / erneut versucht)
    const stale = await tx.order.findMany({ where: { cartId: cart.id, status: "NEW" }, select: { id: true } });
    for (const s of stale) await cancelInTx(tx, s.id, "Ersetzt durch neue Bestellung");

    const problems: string[] = [];
    for (const it of cart.items) {
      const v = it.variant, p = v.product;
      if (p.status !== "ACTIVE" || !v.isActive) problems.push(`${p.name} ist nicht mehr verfügbar.`);
      else if ((v.inventory?.quantity ?? 0) < it.quantity)
        problems.push(`${p.name} (${[v.size, v.color].filter(Boolean).join(", ")}): nur noch ${v.inventory?.quantity ?? 0} verfügbar.`);
    }
    if (problems.length) throw new ApiError(409, problems[0], "stock", { problems });

    const lines = cart.items.map((it) => ({
      it, unit: it.variant.product.currentPriceCents, total: it.variant.product.currentPriceCents * it.quantity,
    }));
    const subtotal = lines.reduce((s, l) => s + l.total, 0);

    let discount = 0, couponId: string | null = null, couponCode: string | null = null;
    if (cart.couponCode) {
      const coupon = await loadCoupon(cart.couponCode, tx);
      if (coupon) {
        const res = evaluateCoupon(coupon, {
          lines: lines.map((l) => ({ productId: l.it.variant.productId, categoryId: l.it.variant.product.categoryId, totalCents: l.total })),
          subtotalCents: subtotal,
          customerRedemptions: await customerRedemptions(coupon.id, input.userId, input.email, tx),
        });
        if (!res.ok) throw new ApiError(409, res.reason, "coupon");
        // Nutzungszähler atomar hochzählen (maxUses-sicher)
        const bumped = await tx.coupon.updateMany({
          where: coupon.maxUses != null ? { id: coupon.id, usedCount: { lt: coupon.maxUses } } : { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
        if (bumped.count !== 1) throw new ApiError(409, "Dieser Gutschein wurde bereits zu oft eingelöst.", "coupon");
        discount = res.discountCents; couponId = coupon.id; couponCode = coupon.code;
      }
    }

    const shipping = shippingCost(input.shippingMethod, Math.max(0, subtotal - discount), settings);
    const total = subtotal - discount + shipping;

    // Bestand atomar reservieren: schlägt fehl, wenn zwischenzeitlich jemand anderes gekauft hat
    for (const l of lines) {
      const res = await tx.inventory.updateMany({
        where: { variantId: l.it.variantId, quantity: { gte: l.it.quantity } },
        data: { quantity: { decrement: l.it.quantity } },
      });
      if (res.count !== 1) throw new ApiError(409, `${l.it.variant.product.name} ist leider nicht mehr in dieser Menge verfügbar.`, "stock");
    }

    const shipAddr = await tx.address.create({ data: clean(input.shipping) });
    const billAddr = input.billing ? await tx.address.create({ data: clean(input.billing) }) : shipAddr;
    const minutes = input.provider === "BANK_TRANSFER" ? 60 * 24 * 7 : settings.reservationMinutes;

    const created = await tx.order.create({
      data: {
        number: await nextOrderNumber(tx),
        userId: input.userId,
        email: input.email,
        subtotalCents: subtotal,
        discountCents: discount,
        shippingCents: shipping,
        totalCents: total,
        taxCents: includedTax(total, settings.taxRatePercent),
        couponId, couponCode,
        shippingMethod: input.shippingMethod,
        shippingAddressId: shipAddr.id,
        billingAddressId: billAddr.id,
        customerNote: input.note || null,
        cartId: cart.id,
        guestToken: newGuestToken(),
        reservationExpiresAt: new Date(Date.now() + minutes * 60_000),
        items: {
          create: lines.map((l) => {
            const v = l.it.variant, p = v.product;
            const img = p.images.find((i) => i.color && i.color === v.color) ?? p.images[0];
            return {
              productId: p.id, variantId: v.id, name: p.name,
              variantLabel: [v.size && `Größe ${v.size}`, v.color].filter(Boolean).join(" · ") || "Standard",
              sku: v.sku, imageUrl: img?.url ?? null, unitPriceCents: l.unit, quantity: l.it.quantity, totalCents: l.total,
            };
          }),
        },
        payments: { create: { provider: input.provider, amountCents: total } },
        ...(couponId ? { redemption: { create: { couponId, userId: input.userId, email: input.email } } } : {}),
      },
      include: { items: true, payments: true },
    });
    return created;
  });

  for (const it of order.items) if (it.productId) void revalidateProduct(it.productId).catch(() => {});
  return order;
}

async function revalidateProduct(productId: string) {
  const p = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  // revalidatePath ist nur im Request-Kontext erlaubt (nicht in Skripten/Cron-Läufen außerhalb von Next)
  try { if (p) revalidatePath(`/product/${p.slug}`); } catch { /* kein Request-Kontext */ }
}

// ───────────────────────── Zahlung bestätigt ─────────────────────────

export async function markOrderPaid(
  orderId: string,
  info: { provider: PaymentProvider; providerRef?: string | null; method?: string | null; captureId?: string | null },
) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
    if (!order) throw new ApiError(404, "Bestellung nicht gefunden.");
    if (order.status !== "NEW" && order.status !== "CANCELLED") return { already: true as const, order };

    let oversold = false;
    if (order.inventoryReleased || order.status === "CANCELLED") {
      // Reservierung war bereits freigegeben → erneut reservieren, soweit möglich
      for (const it of order.items) {
        if (!it.variantId) continue;
        const r = await tx.inventory.updateMany({
          where: { variantId: it.variantId, quantity: { gte: it.quantity } },
          data: { quantity: { decrement: it.quantity } },
        });
        if (r.count !== 1) oversold = true;
      }
    }

    const payment = order.payments.find((p) => p.provider === info.provider) ?? order.payments[0];
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID", paidAt: new Date(), provider: info.provider,
        providerRef: info.providerRef ?? payment.providerRef, method: info.method ?? payment.method,
        captureId: info.captureId ?? payment.captureId, failureReason: null,
      },
    });
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date(), inventoryReleased: false, cancelledAt: null, reservationExpiresAt: null },
    });
    for (const it of order.items)
      if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
    if (order.cartId) await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
    if (order.cartId) await tx.cart.updateMany({ where: { id: order.cartId }, data: { couponCode: null } });
    if (oversold)
      await tx.auditLog.create({ data: { action: "order.oversold", entity: "Order", entityId: order.id, meta: { number: order.number } } });
    return { already: false as const, order: updated };
  });

  if (result.already) return result.order;
  const order = result.order;
  try { await ensureInvoice(order.id); } catch (e) { console.error("[invoice]", e); }
  await notify({
    userId: order.userId, email: order.email, type: "order.paid",
    title: `Bestellung #${order.number} bestätigt`,
    body: `Wir haben deine Zahlung über ${formatEUR(order.totalCents)} erhalten.`,
    href: order.userId ? `/account/orders/${order.number}` : undefined,
    mail: mails.orderPaid({ number: order.number, total: formatEUR(order.totalCents), url: orderUrl(order) }),
  });
  await bustProductPages(order.id);
  return order;
}

export const orderUrl = (o: { id: string; number: number; userId: string | null; guestToken: string }) =>
  o.userId ? `${appUrl()}/account/orders/${o.number}` : `${appUrl()}/checkout/success/${o.id}?t=${o.guestToken}`;

async function bustProductPages(orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId }, select: { productId: true } });
  for (const it of items) if (it.productId) await revalidateProduct(it.productId);
}

// ───────────────────────── Stornieren / freigeben ─────────────────────────

async function cancelInTx(tx: Prisma.TransactionClient, orderId: string, reason: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, redemption: true } });
  if (!order || order.status === "CANCELLED" || order.status === "REFUNDED") return order;
  if (!order.inventoryReleased) {
    for (const it of order.items)
      if (it.variantId) await tx.inventory.updateMany({ where: { variantId: it.variantId }, data: { quantity: { increment: it.quantity } } });
  }
  if (order.redemption) {
    await tx.coupon.update({ where: { id: order.redemption.couponId }, data: { usedCount: { decrement: 1 } } });
    await tx.couponRedemption.delete({ where: { id: order.redemption.id } });
  }
  await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED", failureReason: reason } });
  return tx.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelledAt: new Date(), inventoryReleased: true, reservationExpiresAt: null },
  });
}

export async function cancelOrder(orderId: string, reason: string) {
  const order = await db.$transaction((tx) => cancelInTx(tx, orderId, reason));
  await bustProductPages(orderId);
  return order;
}

/** Unbezahlte Bestellungen mit abgelaufener Reservierung: Bestand zurückbuchen. */
export async function releaseExpiredOrders() {
  const expired = await db.order.findMany({
    where: { status: "NEW", reservationExpiresAt: { lt: new Date() } }, select: { id: true },
  });
  for (const o of expired) await cancelOrder(o.id, "Reservierung abgelaufen");
  return expired.length;
}

// ───────────────────────── Erstattung ─────────────────────────

/**
 * Erstattet eine Bestellung. `external: true` = Rückzahlung wurde bereits beim Zahlungsanbieter ausgelöst
 * (z. B. im Stripe-Dashboard) – dann wird nur der Shop-Zustand nachgezogen, kein zweites Mal erstattet.
 */
export async function refundOrder(orderId: string, opts: { external?: boolean } = {}) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } });
  if (!order) throw new ApiError(404, "Bestellung nicht gefunden.");
  if (!NEXT_STATUS[order.status].includes("REFUNDED")) throw new ApiError(409, "Diese Bestellung kann nicht erstattet werden.");
  const payment = order.payments.find((p) => p.status === "PAID");
  let providerNote = "manuell";

  if (opts.external) {
    providerNote = "extern";
  } else if (payment?.provider === "STRIPE" && payment.providerRef) {
    await stripe().refunds.create({ payment_intent: payment.providerRef }, { idempotencyKey: `refund-${order.id}` });
    providerNote = "Stripe";
  } else if (payment?.provider === "PAYPAL" && payment.captureId) {
    await refundPayPalCapture(payment.captureId, payment.amountCents, `refund-${order.id}`);
    providerNote = "PayPal";
  }

  await db.$transaction(async (tx) => {
    if (payment) await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    // Ware nur zurückbuchen, wenn sie noch nicht versendet wurde
    if (["PAID", "PROCESSING"].includes(order.status) && !order.inventoryReleased) {
      for (const it of order.items)
        if (it.variantId) await tx.inventory.updateMany({ where: { variantId: it.variantId }, data: { quantity: { increment: it.quantity } } });
    }
    for (const it of order.items)
      if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { decrement: it.quantity } } });
    await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED", inventoryReleased: true } });
  });
  await notify({
    userId: order.userId, email: order.email, type: "order.refunded",
    title: `Erstattung für Bestellung #${order.number}`, body: `Wir haben ${formatEUR(order.totalCents)} erstattet.`,
    href: order.userId ? `/account/orders/${order.number}` : undefined,
    mail: { subject: `Erstattung Bestellung #${order.number}`, text: `Wir haben ${formatEUR(order.totalCents)} zu deiner Bestellung #${order.number} erstattet.` },
  });
  await bustProductPages(order.id);
  return providerNote;
}

// ───────────────────────── Versand ─────────────────────────

export async function shipOrder(orderId: string, opts: { carrier: string; trackingNumber?: string; trackingUrl?: string }) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Bestellung nicht gefunden.");
  if (!["PAID", "PROCESSING"].includes(order.status)) throw new ApiError(409, "Nur bezahlte Bestellungen können versendet werden.");
  await db.$transaction([
    db.shipment.create({
      data: {
        orderId, carrier: opts.carrier, trackingNumber: opts.trackingNumber || null,
        trackingUrl: opts.trackingUrl || null, status: "SHIPPED", shippedAt: new Date(),
      },
    }),
    db.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } }),
  ]);
  await notify({
    userId: order.userId, email: order.email, type: "order.shipped",
    title: `Bestellung #${order.number} ist unterwegs`, body: `Versand mit ${opts.carrier}${opts.trackingNumber ? ` · ${opts.trackingNumber}` : ""}`,
    href: order.userId ? `/account/orders/${order.number}` : undefined,
    mail: mails.orderShipped({ number: order.number, carrier: opts.carrier, tracking: opts.trackingNumber, trackingUrl: opts.trackingUrl, url: orderUrl(order) }),
  });
}

export async function markDelivered(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "SHIPPED") throw new ApiError(409, "Nur versendete Bestellungen können zugestellt werden.");
  await db.$transaction([
    db.shipment.updateMany({ where: { orderId, status: "SHIPPED" }, data: { status: "DELIVERED", deliveredAt: new Date() } }),
    db.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } }),
  ]);
  await notify({
    userId: order.userId, type: "order.delivered", title: `Bestellung #${order.number} zugestellt`,
    body: "Wie gefallen dir deine Lieblingsstücke? Bewerte sie in deiner Bestellung.",
    href: order.userId ? `/account/orders/${order.number}` : undefined,
  });
}
