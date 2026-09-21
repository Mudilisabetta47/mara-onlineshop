import type { PrismaClient } from "@prisma/client";
import { categories } from "./base-data";
import { appEnv } from "../../src/lib/config";

/**
 * Produktionssicherer Basis-Seed: Kategorien (Shop-Struktur) und leere Einstellungen.
 * Idempotent und nicht-überschreibend – bereits im Admin geänderte Werte bleiben unangetastet.
 * Enthält KEINE Produkte, Marken, Gutscheine, Kunden oder Bestellungen.
 */
export async function seedBase(db: PrismaClient) {
  const demoImages = appEnv() === "local"; // Platzhalter-Bilder nur lokal referenzieren
  for (const c of categories) {
    await db.category.upsert({
      where: { slug: c.slug }, update: {},
      create: { ...c, image: demoImages ? `/seed/e/cat-${c.slug === "dies-und-das" ? "dies" : c.slug}.webp` : null },
    });
  }
  await db.setting.upsert({ where: { key: "shop" }, update: {}, create: { key: "shop", value: {} } });
  console.log(`✓ Basis: ${categories.length} Kategorien, Einstellungen`);
}
