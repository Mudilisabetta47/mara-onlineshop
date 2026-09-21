import { NextResponse } from "next/server";
import { releaseExpiredOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Gibt den Bestand unbezahlter, abgelaufener Bestellungen frei. Aufruf per Cron mit `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ released: await releaseExpiredOrders() });
}
