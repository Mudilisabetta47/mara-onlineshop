import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Öffentliche Dateien (Produktbilder). Private Dateien werden hier nie ausgeliefert. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const file = await db.storedFile.findUnique({ where: { key } });
  if (!file || file.visibility !== "PUBLIC") return new NextResponse("Not found", { status: 404 });
  try {
    const data = await storage.get(key);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
