/** Setzt die LOKALE Entwicklungsdatenbank zurück. Verweigert alles außer APP_ENV=local + localhost. Aufruf: node --env-file=.env scripts/db-reset-local.mjs */
import { spawnSync } from "node:child_process";
const url = process.env.DATABASE_URL ?? "";
let host = ""; try { host = new URL(url).hostname; } catch {}
if (process.env.APP_ENV !== "local" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
  console.error(`✖ Abbruch: Reset nur mit APP_ENV=local und lokaler Datenbank (aktuell APP_ENV=${process.env.APP_ENV ?? "?"}, Host=${host || "?"}).`);
  process.exit(1);
}
console.log("Lokale Datenbank wird zurückgesetzt …");
const r = spawnSync("npx prisma migrate reset --force", { shell: true, stdio: "inherit" });
process.exit(r.status ?? 1);
