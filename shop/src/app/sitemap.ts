import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { isLive } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isLive()) return [];
  const base = appUrl();
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE", category: { isActive: true } }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const fixed = ["", "/shop", "/versand", "/zahlungsarten", "/widerruf", "/agb", "/datenschutz", "/impressum"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: p === "" ? ("daily" as const) : ("monthly" as const), priority: p === "" ? 1 : p === "/shop" ? 0.9 : 0.4 })),
    ...categories.map((c) => ({ url: `${base}/shop/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
