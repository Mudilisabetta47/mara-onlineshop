/**
 * Entfernt Demo-Katalog (nur staging/local; NIE production): Produkte des Demo-Seeds, Demo-Gutscheine, Demo-Marken.
 * Bricht ab, wenn Bestellungen auf Demo-Produkte verweisen. Aufruf: CONFIRM_PURGE=yes npm run db:purge-demo
 */
import { PrismaClient } from "@prisma/client";
import { products, coupons } from "../prisma/catalog";
import { demoBrands } from "../prisma/seed/base-data";
import { appEnv } from "../src/lib/config";
import { describeTarget } from "../prisma/seed/guard";
const db = new PrismaClient();
(async () => {
  console.log(`Purge Demo → ${appEnv()} · ${describeTarget()}`);
  if (appEnv() === "production") throw new Error("In production nicht erlaubt.");
  if (process.env.CONFIRM_PURGE !== "yes") throw new Error("CONFIRM_PURGE=yes setzen.");
  const skus = products.map((p) => p.sku);
  if ((await db.orderItem.count({ where: { product: { sku: { in: skus } } } })) > 0) throw new Error("Bestellungen referenzieren Demo-Produkte – Abbruch.");
  const a = await db.product.deleteMany({ where: { sku: { in: skus } } });
  const b = await db.coupon.deleteMany({ where: { code: { in: coupons.map((c) => c.code) } } });
  const c = await db.brand.deleteMany({ where: { slug: { in: demoBrands.map((x) => x.slug) }, products: { none: {} } } });
  await db.setting.deleteMany({ where: { key: "demo_seed" } });
  console.log(`✓ entfernt: ${a.count} Produkte, ${b.count} Gutscheine, ${c.count} Marken`);
})().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());
