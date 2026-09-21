import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturePayPalOrder } from "@/lib/paypal";
import { markOrderPaid } from "@/lib/orders";
import { getOrderForViewer } from "@/lib/order-access";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Rückkehr von PayPal (GET-Redirect): Zahlung serverseitig capturen, Betrag prüfen, Bestellung bezahlt setzen. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const orderId = u.searchParams.get("order") ?? "";
  const t = u.searchParams.get("t");
  const token = u.searchParams.get("token"); // PayPal-Order-ID
  const fail = (m: string) => NextResponse.redirect(`${appUrl()}/checkout?error=${encodeURIComponent(m)}`);

  const order = await getOrderForViewer(orderId, t);
  const payment = order?.payments.find((p) => p.provider === "PAYPAL");
  if (!order || !payment || !token || payment.providerRef !== token) return fail("Zahlung konnte nicht zugeordnet werden.");

  const done = `${appUrl()}/checkout/success/${order.id}?t=${order.guestToken}`;
  if (order.status !== "NEW") return NextResponse.redirect(done);

  try {
    const cap = await capturePayPalOrder(token);
    if (!cap.completed || !cap.captureId || Number(cap.amount?.value) * 100 !== order.totalCents || cap.amount?.currency_code !== "EUR")
      throw new Error("capture not completed / amount mismatch");
    await markOrderPaid(order.id, { provider: "PAYPAL", providerRef: token, captureId: cap.captureId, method: "paypal" });
    return NextResponse.redirect(done);
  } catch (e) {
    console.error("[paypal return]", e);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "PayPal-Capture fehlgeschlagen" } });
    return fail("Die PayPal-Zahlung konnte nicht abgeschlossen werden.");
  }
}
