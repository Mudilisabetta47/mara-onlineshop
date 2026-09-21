import { db } from "@/lib/db";
import { ok, route, ApiError } from "@/lib/http";
import { checkoutSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveCart } from "@/lib/cart";
import { createOrderFromCart, cancelOrder, markOrderPaid, orderUrl } from "@/lib/orders";
import { appUrl, bankTransferAllowed, paypalEnabled, stripeEnabled, testPaymentEnabled } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { createPayPalOrder } from "@/lib/paypal";
import { getSettings } from "@/lib/settings";
import { formatEUR } from "@/lib/money";
import { sendMail, mails } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Legt die Bestellung an und startet – je nach Zahlart – die Zahlung.
 * Alle Beträge werden serverseitig aus dem Warenkorb berechnet; es werden keine Zahlungsdaten gespeichert.
 */
export const POST = route(
  async (req) => {
    const input = checkoutSchema.parse(await req.json());
    const s = await getSettings();

    const allowed =
      (input.provider === "STRIPE" && stripeEnabled()) ||
      (input.provider === "PAYPAL" && paypalEnabled()) ||
      (input.provider === "BANK_TRANSFER" && bankTransferAllowed(s.bankIban)) ||
      (input.provider === "TEST" && testPaymentEnabled());
    if (!allowed) throw new ApiError(400, "Diese Zahlungsart ist derzeit nicht verfügbar.", "provider");

    const user = await getCurrentUser();
    const cart = await resolveCart(false);
    if (!cart) throw new ApiError(400, "Dein Warenkorb ist leer.", "empty_cart");

    const order = await createOrderFromCart({
      cartId: cart.id,
      userId: user?.id ?? null,
      email: user?.email ?? input.email,
      shipping: input.shipping,
      billing: input.billing,
      shippingMethod: input.shippingMethod,
      provider: input.provider,
      note: input.note,
    });
    const payment = order.payments[0];
    const base = { orderId: order.id, number: order.number, guestToken: order.guestToken, totalCents: order.totalCents };
    const successUrl = `/checkout/success/${order.id}?t=${order.guestToken}`;

    try {
      if (input.provider === "STRIPE") {
        const pi = await stripe().paymentIntents.create(
          {
            amount: order.totalCents,
            currency: "eur",
            automatic_payment_methods: { enabled: true },
            receipt_email: order.email,
            description: `Bestellung #${order.number}`,
            metadata: { orderId: order.id, orderNumber: String(order.number) },
          },
          { idempotencyKey: `pi-${order.id}` },
        );
        await db.payment.update({ where: { id: payment.id }, data: { providerRef: pi.id } });
        return ok({ ...base, action: "stripe", clientSecret: pi.client_secret, returnUrl: `${appUrl()}${successUrl}` });
      }

      if (input.provider === "PAYPAL") {
        const pp = await createPayPalOrder({ id: order.id, number: order.number, totalCents: order.totalCents, guestToken: order.guestToken });
        await db.payment.update({ where: { id: payment.id }, data: { providerRef: pp.paypalOrderId } });
        return ok({ ...base, action: "redirect", url: pp.approveUrl });
      }

      if (input.provider === "BANK_TRANSFER") {
        // Bestellung ist verbindlich aufgegeben → Warenkorb leeren, Bestand bleibt reserviert
        await db.$transaction([
          db.cartItem.deleteMany({ where: { cartId: cart.id } }),
          db.cart.update({ where: { id: cart.id }, data: { couponCode: null } }),
          db.order.update({ where: { id: order.id }, data: { cartId: null } }),
        ]);
        const bank = [s.bankHolder && `Kontoinhaber: ${s.bankHolder}`, s.bankIban && `IBAN: ${s.bankIban}`, s.bankBic && `BIC: ${s.bankBic}`, s.bankName && `Bank: ${s.bankName}`]
          .filter(Boolean).join("\n") || "(Bankverbindung wird im Admin unter Einstellungen gepflegt)";
        await sendMail({ to: order.email, ...mails.orderPlacedBankTransfer({ number: order.number, total: formatEUR(order.totalCents), url: orderUrl(order), bank }) });
        return ok({ ...base, action: "done", url: successUrl });
      }

      // TEST (nur Entwicklung ohne Stripe-Keys)
      await markOrderPaid(order.id, { provider: "TEST", method: "test" });
      return ok({ ...base, action: "done", url: successUrl });
    } catch (e) {
      // PSP nicht erreichbar → Bestand & Gutschein wieder freigeben, damit nichts „hängen bleibt“
      await cancelOrder(order.id, "Zahlungsstart fehlgeschlagen").catch(() => {});
      console.error("[checkout] payment start failed", e);
      throw new ApiError(502, "Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut oder wähle eine andere Zahlungsart.", "psp");
    }
  },
  { limit: { key: "checkout", max: 20, windowMs: 10 * 60_000 } },
);
