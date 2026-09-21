import { z } from "zod";
import { ok, route, ApiError } from "@/lib/http";
import { getOrderForViewer } from "@/lib/order-access";
import { markOrderPaid } from "@/lib/orders";
import { stripe } from "@/lib/stripe";
import { stripeEnabled } from "@/lib/env";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Nach der Rückkehr von Stripe: Zahlungsstatus serverseitig bei Stripe prüfen (nicht dem Client vertrauen)
 * und die Bestellung idempotent auf „bezahlt“ setzen. Der Webhook macht dasselbe – wer zuerst kommt, gewinnt.
 */
export const POST = route(
  async (req) => {
    const { orderId, t } = z.object({ orderId: z.string(), t: z.string().optional() }).parse(await req.json());
    let order = await getOrderForViewer(orderId, t);
    if (!order) throw new ApiError(404, "Bestellung nicht gefunden.");

    const payment = order.payments[0];
    if (order.status === "NEW" && payment?.provider === "STRIPE" && payment.providerRef && stripeEnabled()) {
      const pi = await stripe().paymentIntents.retrieve(payment.providerRef);
      if (pi.status === "succeeded" && pi.amount_received === order.totalCents && pi.currency === "eur") {
        await markOrderPaid(order.id, { provider: "STRIPE", providerRef: pi.id, method: typeof pi.payment_method === "string" ? undefined : pi.payment_method?.type });
      } else if (pi.status === "requires_payment_method" && pi.last_payment_error) {
        await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: pi.last_payment_error.message?.slice(0, 200) } });
      }
      order = (await getOrderForViewer(orderId, t))!;
    }
    return ok({ status: order.status, paymentStatus: order.payments[0]?.status });
  },
  { limit: { key: "verify", max: 60, windowMs: 60_000 } },
);
