import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { cookieName, isProd } from "./env";
import { getCurrentUser } from "./auth/session";
import { randomToken } from "./auth/password";
import { getSettings } from "./settings";
import { includedTax } from "./money";
import { shippingCost, type ShippingMethodId } from "./shipping";
import { evaluateCoupon, type CouponScope } from "./coupons";
import { ApiError } from "./http";

export const CART_COOKIE = cookieName("lumi_cart");
export const WISH_COOKIE = cookieName("lumi_wish");
export const MAX_QTY_PER_LINE = 10;

const guestCookie = { httpOnly: true, sameSite: "lax" as const, secure: isProd(), path: "/", maxAge: 60 * 60 * 24 * 90 };

// ───────────────────────── Warenkorb ermitteln ─────────────────────────

/** Liefert den Warenkorb des Nutzers bzw. des Gasts (Cookie). Nur in Route Handlern / Actions verwenden. */
export async function resolveCart(create: boolean) {
  const user = await getCurrentUser();
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;

  if (user) {
    let cart = await db.cart.findUnique({ where: { userId: user.id } });
    if (token) {
      const guest = await db.cart.findUnique({ where: { token }, include: { items: true } });
      if (guest && guest.userId === null) {
        if (!cart) {
          cart = await db.cart.update({ where: { id: guest.id }, data: { userId: user.id } });
        } else {
          await mergeItems(guest.id, cart.id);
          await db.cart.delete({ where: { id: guest.id } });
        }
      }
      jar.delete(CART_COOKIE);
    }
    if (!cart && create) cart = await db.cart.create({ data: { token: randomToken(24), userId: user.id } });
    return cart;
  }

  if (token) {
    const cart = await db.cart.findUnique({ where: { token } });
    if (cart && cart.userId === null) return cart;
  }
  if (!create) return null;
  const cart = await db.cart.create({ data: { token: randomToken(24) } });
  jar.set(CART_COOKIE, cart.token, guestCookie);
  return cart;
}

async function mergeItems(fromCartId: string, toCartId: string) {
  const items = await db.cartItem.findMany({ where: { cartId: fromCartId } });
  for (const it of items) {
    const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: toCartId, variantId: it.variantId } } });
    if (existing) {
      await db.cartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(MAX_QTY_PER_LINE, existing.quantity + it.quantity) } });
    } else {
      await db.cartItem.create({ data: { cartId: toCartId, variantId: it.variantId, quantity: it.quantity } });
    }
  }
}

// ───────────────────────── Ansicht ─────────────────────────

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  compareAtCents: number | null;
  quantity: number;
  stock: number;
  lineTotalCents: number;
  problem: "sold_out" | "reduced" | "unavailable" | null;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  discountCents: number;
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  shippingCents: number;
  freeShippingThresholdCents: number;
  totalCents: number;
  taxCents: number;
  hasProblems: boolean;
};

export const EMPTY_CART: CartView = {
  id: null, lines: [], count: 0, subtotalCents: 0, discountCents: 0, coupon: null, couponError: null,
  shippingCents: 0, freeShippingThresholdCents: 7500, totalCents: 0, taxCents: 0, hasProblems: false,
};

type Client = Prisma.TransactionClient | typeof db;

export async function loadCoupon(code: string, client: Client = db): Promise<CouponScope | null> {
  return client.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { products: { select: { id: true } }, categories: { select: { id: true } } },
  });
}

export async function customerRedemptions(couponId: string, userId: string | null, email?: string | null, client: Client = db) {
  const or = [
    ...(userId ? [{ userId }] : []),
    ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
  ];
  if (!or.length) return 0;
  return client.couponRedemption.count({ where: { couponId, order: { status: { notIn: ["CANCELLED"] } }, OR: or } });
}

export async function buildCartView(
  cartId: string | null,
  opts: { shippingMethod?: ShippingMethodId; email?: string | null } = {},
): Promise<CartView> {
  if (!cartId) return EMPTY_CART;
  const [cart, settings, user] = await Promise.all([
    db.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            variant: {
              include: {
                inventory: { select: { quantity: true } },
                product: { include: { images: { orderBy: { position: "asc" } } } },
              },
            },
          },
        },
      },
    }),
    getSettings(),
    getCurrentUser(),
  ]);
  if (!cart) return EMPTY_CART;

  const lines: CartLine[] = cart.items.map((it) => {
    const v = it.variant, p = v.product;
    const stock = v.inventory?.quantity ?? 0;
    const active = p.status === "ACTIVE" && v.isActive;
    const img = p.images.find((i) => i.color && i.color === v.color) ?? p.images[0];
    const problem = !active ? "unavailable" : stock === 0 ? "sold_out" : it.quantity > stock ? "reduced" : null;
    const qty = problem === "reduced" ? stock : it.quantity;
    return {
      id: it.id, variantId: v.id, productId: p.id, slug: p.slug, name: p.name, size: v.size, color: v.color,
      imageUrl: img?.url ?? null,
      unitPriceCents: p.currentPriceCents,
      compareAtCents: p.salePriceCents != null && p.salePriceCents < p.basePriceCents ? p.basePriceCents : null,
      quantity: it.quantity, stock, problem,
      lineTotalCents: problem === "sold_out" || problem === "unavailable" ? 0 : p.currentPriceCents * qty,
    };
  });

  const purchasable = lines.filter((l) => !l.problem || l.problem === "reduced");
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);

  let discountCents = 0, coupon: CartView["coupon"] = null, couponError: string | null = null;
  if (cart.couponCode) {
    const c = await loadCoupon(cart.couponCode);
    if (!c) couponError = "Gutschein nicht gefunden.";
    else {
      const productMeta = await db.product.findMany({
        where: { id: { in: purchasable.map((l) => l.productId) } }, select: { id: true, categoryId: true },
      });
      const cat = new Map(productMeta.map((p) => [p.id, p.categoryId]));
      const res = evaluateCoupon(c, {
        lines: purchasable.map((l) => ({ productId: l.productId, categoryId: cat.get(l.productId)!, totalCents: l.lineTotalCents })),
        subtotalCents,
        customerRedemptions: await customerRedemptions(c.id, user?.id ?? null, opts.email ?? user?.email),
      });
      if (res.ok) { discountCents = res.discountCents; coupon = { code: c.code, description: c.description }; }
      else couponError = res.reason;
    }
  }

  const goods = Math.max(0, subtotalCents - discountCents);
  const shippingCents = subtotalCents === 0 ? 0 : shippingCost(opts.shippingMethod ?? "standard", goods, settings);
  const totalCents = goods + shippingCents;
  return {
    id: cart.id,
    lines,
    count: lines.reduce((s, l) => s + (l.problem === "sold_out" || l.problem === "unavailable" ? 0 : l.problem === "reduced" ? l.stock : l.quantity), 0),
    subtotalCents, discountCents, coupon, couponError, shippingCents,
    freeShippingThresholdCents: settings.freeShippingThresholdCents,
    totalCents,
    taxCents: includedTax(totalCents, settings.taxRatePercent),
    hasProblems: lines.some((l) => l.problem),
  };
}

// ───────────────────────── Mutationen ─────────────────────────

export async function addToCart(variantId: string, quantity: number) {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { status: true, name: true } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE")
    throw new ApiError(404, "Dieser Artikel ist nicht verfügbar.", "unavailable");
  const stock = variant.inventory?.quantity ?? 0;
  if (stock <= 0) throw new ApiError(409, "Leider ausverkauft.", "sold_out");

  const cart = (await resolveCart(true))!;
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const wanted = (existing?.quantity ?? 0) + quantity;
  const qty = Math.min(wanted, stock, MAX_QTY_PER_LINE);
  if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { quantity: qty } });
  else await db.cartItem.create({ data: { cartId: cart.id, variantId, quantity: qty } });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return { cartId: cart.id, capped: qty < wanted, stock };
}

export async function setLineQuantity(itemId: string, quantity: number) {
  const cart = await resolveCart(false);
  if (!cart) throw new ApiError(404, "Warenkorb nicht gefunden.");
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id }, include: { variant: { include: { inventory: true } } },
  });
  if (!item) throw new ApiError(404, "Position nicht gefunden.");
  if (quantity <= 0) { await db.cartItem.delete({ where: { id: item.id } }); return { cartId: cart.id }; }
  const stock = item.variant.inventory?.quantity ?? 0;
  await db.cartItem.update({ where: { id: item.id }, data: { quantity: Math.max(1, Math.min(quantity, stock || 1, MAX_QTY_PER_LINE)) } });
  return { cartId: cart.id };
}

export async function setCoupon(code: string | null) {
  const cart = await resolveCart(true);
  await db.cart.update({ where: { id: cart!.id }, data: { couponCode: code ? code.trim().toUpperCase() : null } });
  return cart!.id;
}

// ───────────────────────── Login-Merge (Gast → Konto) ─────────────────────────

/** Nach Login/Registrierung aufrufen: Gast-Warenkorb und -Wunschliste ins Konto übernehmen. */
export async function mergeGuestData(userId: string) {
  const jar = await cookies();
  const cartToken = jar.get(CART_COOKIE)?.value;
  if (cartToken) {
    const guest = await db.cart.findUnique({ where: { token: cartToken } });
    if (guest && !guest.userId) {
      const mine = await db.cart.findUnique({ where: { userId } });
      if (!mine) await db.cart.update({ where: { id: guest.id }, data: { userId } });
      else { await mergeItems(guest.id, mine.id); await db.cart.delete({ where: { id: guest.id } }); }
    }
    jar.delete(CART_COOKIE);
  }
  const wishToken = jar.get(WISH_COOKIE)?.value;
  if (wishToken) {
    const guest = await db.wishlist.findUnique({ where: { token: wishToken }, include: { items: true } });
    if (guest && !guest.userId) {
      const mine = (await db.wishlist.findUnique({ where: { userId } })) ?? (await db.wishlist.create({ data: { token: randomToken(24), userId } }));
      for (const it of guest.items) {
        await db.wishlistItem.upsert({
          where: { wishlistId_productId: { wishlistId: mine.id, productId: it.productId } },
          update: {}, create: { wishlistId: mine.id, productId: it.productId },
        });
      }
      await db.wishlist.delete({ where: { id: guest.id } });
    }
    jar.delete(WISH_COOKIE);
  }
}

// ───────────────────────── Wunschliste ─────────────────────────

export async function resolveWishlist(create: boolean) {
  const user = await getCurrentUser();
  const jar = await cookies();
  if (user) {
    const w = await db.wishlist.findUnique({ where: { userId: user.id } });
    if (w || !create) return w;
    return db.wishlist.create({ data: { token: randomToken(24), userId: user.id } });
  }
  const token = jar.get(WISH_COOKIE)?.value;
  if (token) {
    const w = await db.wishlist.findUnique({ where: { token } });
    if (w && !w.userId) return w;
  }
  if (!create) return null;
  const w = await db.wishlist.create({ data: { token: randomToken(24) } });
  jar.set(WISH_COOKIE, w.token, guestCookie);
  return w;
}
