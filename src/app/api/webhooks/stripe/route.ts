import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { markOrderPaid, refundOrder, NEXT_STATUS } from "@/lib/orders";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Stripe-Webhook (Signatur wird geprüft). Endpoint: /api/webhooks/stripe – Events: payment_intent.succeeded, payment_intent.payment_failed */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      const payment = orderId ? await db.payment.findFirst({ where: { orderId, providerRef: pi.id }, include: { order: true } }) : null;
      if (payment && payment.order.totalCents === pi.amount_received && pi.currency === "eur") {
        await markOrderPaid(payment.orderId, { provider: "STRIPE", providerRef: pi.id });
      } else {
        console.error("[stripe webhook] Zuordnung/Betrag passt nicht", pi.id);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await db.payment.updateMany({
        where: { providerRef: pi.id, status: "PENDING" },
        data: { status: "FAILED", failureReason: pi.last_payment_error?.message?.slice(0, 200) },
      });
    } else if (event.type === "charge.refunded") {
      // Erstattung im Stripe-Dashboard ausgelöst → Bestellstatus/Bestand nachziehen (idempotent)
      const ch = event.data.object as Stripe.Charge;
      const ref = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      const payment = ref ? await db.payment.findFirst({ where: { providerRef: ref }, include: { order: true } }) : null;
      if (payment) {
        if (ch.amount_refunded >= payment.order.totalCents && NEXT_STATUS[payment.order.status].includes("REFUNDED")) {
          await refundOrder(payment.orderId, { external: true });
        } else if (ch.amount_refunded < payment.order.totalCents) {
          await audit(null, "order.partial_refund_external", "Order", payment.orderId, { refundedCents: ch.amount_refunded });
        }
      }
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 }); // Stripe wiederholt den Versand
  }
  return NextResponse.json({ received: true });
}
