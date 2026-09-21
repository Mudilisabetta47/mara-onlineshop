/**
 * Seed-CLI:  tsx prisma/seed/index.ts <base|demo|admin|local>
 *   base   Kategorien + Einstellungen (produktionssicher)
 *   admin  ersten Administrator anlegen (Bootstrap, überschreibt nie)
 *   demo   Demo-Katalog + Test-Gutscheine (NIE production)
 *   local  = base + demo + admin (nur APP_ENV=local)
 */
import { PrismaClient } from "@prisma/client";
import { assertSeedAllowed, type SeedKind } from "./guard";
import { seedBase } from "./base";
import { seedDemo } from "./demo";
import { seedAdmin } from "./admin";
import { appEnv } from "../../src/lib/config";

const db = new PrismaClient();
const arg = process.argv[2];

async function main() {
  if (arg === "local") {
    if (appEnv() !== "local") throw new Error("„local“ ist nur mit APP_ENV=local erlaubt.");
    for (const k of ["base", "demo", "admin"] as SeedKind[]) assertSeedAllowed(k);
    await seedBase(db); await seedDemo(db); await seedAdmin(db);
    return;
  }
  if (arg !== "base" && arg !== "demo" && arg !== "admin") throw new Error("Nutzung: seed <base|demo|admin|local>");
  assertSeedAllowed(arg);
  if (arg === "base") await seedBase(db);
  if (arg === "demo") { await seedBase(db); await seedDemo(db); }
  if (arg === "admin") await seedAdmin(db);
}
main().catch((e) => { console.error("\n" + (e as Error).message); process.exit(1); }).finally(() => db.$disconnect());
