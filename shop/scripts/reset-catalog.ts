/** Dev-Helfer: Katalog löschen (nur APP_ENV=local, nur ohne Bestellungen). */
import { PrismaClient } from "@prisma/client";
import { appEnv } from "../src/lib/config";
const db = new PrismaClient();
(async () => {
  if (appEnv() !== "local" || process.env.NODE_ENV === "production") throw new Error("Nur mit APP_ENV=local erlaubt.");
  if ((await db.order.count()) > 0) throw new Error("Es existieren Bestellungen – Abbruch.");
  console.log("Produkte gelöscht:", (await db.product.deleteMany()).count);
})().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());
