import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Private Dateien (Rechnungen, Vertragsdokumente) – Zugriff nur für Admin, den Besitzer
 * oder (Rechnung eines Gastes) mit gültigem Bestell-Token (?t=…).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = new URL(req.url).searchParams.get("t");
  const file = await db.storedFile.findUnique({
    where: { id },
    include: { order: { select: { userId: true, guestToken: true } }, contract: { include: { contract: { select: { userId: true } } } } },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });

  const user = await getCurrentUser();
  let allowed = file.visibility === "PUBLIC" || user?.role === "ADMIN";
  if (!allowed && user) allowed = file.order?.userId === user.id || file.contract?.contract.userId === user.id;
  if (!allowed && t && file.order) {
    const a = Buffer.from(t), b = Buffer.from(file.order.guestToken);
    allowed = a.length === b.length && timingSafeEqual(a, b);
  }
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await storage.get(file.key);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
