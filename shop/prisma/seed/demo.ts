import type { PrismaClient } from "@prisma/client";
import { brands, products, coupons, sizeGuides, rnd } from "../catalog";
import { slugify } from "../../src/lib/slug";

function stockFor(sku: string, size: string, override?: Record<string, number>): number {
  if (override && size in override) return override[size];
  const r = rnd(sku + size);
  if (r < 0.07) return 0;
  if (r < 0.25) return 1 + Math.floor(rnd(size + sku) * 3);
  return 4 + Math.floor(rnd(sku) * 12);
}

/** Demo-/Testkatalog (fiktive Marken und Produkte, generierte Platzhalterbilder). NUR local/staging. */
export async function seedDemo(db: PrismaClient) {
  for (const b of brands) await db.brand.upsert({ where: { slug: b.slug }, update: {}, create: b });
  const cat = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const brand = Object.fromEntries((await db.brand.findMany()).map((b) => [b.slug, b.id]));

  let created = 0;
  for (const p of products) {
    if (await db.product.findUnique({ where: { slug: p.slug } })) continue;
    const images = p.colors.flatMap((c, ci) => {
      const cs = slugify(c.name);
      return [1, 2].map((n) => ({ url: `/seed/p/${p.slug}-${cs}-${n}.webp`, alt: `${p.name} – ${c.name}${n === 2 ? " (Detail)" : ""}`, position: ci * 2 + n - 1, color: c.name }));
    });
    const variants = p.colors.flatMap((c, ci) =>
      (p.oneSize ? [""] : p.sizes).map((size, si) => ({
        sku: `${p.sku}-${slugify(c.name).slice(0, 3).toUpperCase()}${size ? `-${size}` : ""}`,
        size: size || null, color: c.name, colorHex: c.hex, position: ci * 20 + si,
        inventory: { create: { quantity: p.oneSize ? (p.stock?.[""] ?? 5 + Math.floor(rnd(p.sku + c.name) * 15)) : stockFor(p.sku + c.name, size, p.stock), lowStockThreshold: 3 } },
      })),
    );
    await db.product.create({
      data: {
        slug: p.slug, name: p.name, shortDescription: p.short, description: p.description, material: p.material,
        careInfo: "Bei 30 °C im Schonwaschgang waschen, auf links drehen, nicht im Trockner trocknen.",
        sizeGuide: p.oneSize ? null : p.category === "schuhe" ? sizeGuides.shoes : sizeGuides.clothes,
        sku: p.sku, basePriceCents: p.price, salePriceCents: p.sale ?? null, currentPriceCents: p.sale ?? p.price,
        status: "ACTIVE", weightGrams: p.weight, featured: !!p.featured, soldCount: p.sold,
        categoryId: cat[p.category], brandId: brand[p.brand],
        seoTitle: `${p.name} – ${p.short.replace(/\.$/, "")}`.slice(0, 70),
        seoDescription: `${p.short} ${p.material}. Jetzt online kaufen – schneller Versand, 30 Tage Rückgabe.`.slice(0, 160),
        createdAt: new Date(Date.now() - p.ageDays * 86400_000),
        images: { create: images }, variants: { create: variants },
      },
    });
    created++;
  }
  for (const c of coupons) await db.coupon.upsert({ where: { code: c.code }, update: {}, create: { ...c, isActive: true } });
  // Markierung, damit Health-/Readiness-Check Demo-Daten in staging/production erkennt
  await db.setting.upsert({ where: { key: "demo_seed" }, update: { value: { at: new Date().toISOString() } }, create: { key: "demo_seed", value: { at: new Date().toISOString() } } });
  console.log(`✓ Demo: ${created} neue Produkte, ${coupons.length} Gutscheine`);
}
