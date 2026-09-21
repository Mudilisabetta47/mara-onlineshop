import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rl = await rateLimit(`search:${clientIp(req.headers)}`, 90, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] });
  const { products, categories } = await searchProducts(q, 8);
  return NextResponse.json({
    categories,
    products: products.map((p) => ({
      slug: p.slug, name: p.name, brand: p.brand, category: p.category.name, image: p.image,
      priceCents: p.priceCents, compareAtCents: p.compareAtCents, soldOut: p.soldOut,
    })),
  });
}
