/**
 * Vercel-Build: Prisma generieren → (Production/Preview) Migrationen anwenden → Next-Build.
 * - Migrationen laufen über DIRECT_URL (nicht gepoolt) und NUR als `migrate deploy` (nie reset/push).
 * - Preview-Deployments migrieren ausschließlich die Staging-Datenbank – dafür muss der Vercel-Scope „Preview“
 *   eigene DATABASE_URL/DIRECT_URL besitzen (siehe docs/PRODUCTION.md).
 * - SKIP_MIGRATIONS=1 überspringt den Schritt (z. B. wenn Migrationen aus der CI laufen).
 */
import { spawnSync } from "node:child_process";

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  const r = spawnSync(cmd, { shell: true, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const vercelEnv = process.env.VERCEL_ENV; // production | preview | development | undefined (lokal)
const target = (() => { try { const u = new URL(process.env.DATABASE_URL ?? ""); return `${u.hostname}/${u.pathname.slice(1)}`; } catch { return "(ungültig)"; } })();
console.log(`Build-Umgebung: ${vercelEnv ?? "lokal"} · APP_ENV=${process.env.APP_ENV ?? "(abgeleitet)"} · DB: ${target}`);

run("npx prisma generate");

if ((vercelEnv === "production" || vercelEnv === "preview") && process.env.SKIP_MIGRATIONS !== "1") {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    console.error("\n✖ DATABASE_URL und DIRECT_URL müssen für den Migrationsschritt gesetzt sein (Vercel → Settings → Environment Variables, richtiger Scope).");
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1|::1/.test(process.env.DIRECT_URL)) { console.error("\n✖ DIRECT_URL zeigt auf eine lokale Datenbank."); process.exit(1); }
  run("npx prisma migrate deploy");
}
run("npx next build");
