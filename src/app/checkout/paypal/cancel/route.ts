import { NextResponse } from "next/server";
import { getOrderForViewer } from "@/lib/order-access";
import { cancelOrder } from "@/lib/orders";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Kunde hat die PayPal-Freigabe abgebrochen → Reservierung aufheben, zurück zur Kasse (Warenkorb bleibt erhalten). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const order = await getOrderForViewer(u.searchParams.get("order") ?? "", u.searchParams.get("t"));
  if (order && order.status === "NEW") await cancelOrder(order.id, "PayPal abgebrochen");
  return NextResponse.redirect(`${appUrl()}/checkout?error=${encodeURIComponent("Die PayPal-Zahlung wurde abgebrochen.")}`);
}
