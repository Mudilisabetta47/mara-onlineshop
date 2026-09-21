import { appEnv, validateConfig } from "../../src/lib/config";

export type SeedKind = "base" | "demo" | "admin";

/** Zeigt das Ziel ohne Zugangsdaten (Host/DB-Name) – damit vor jedem Seed sichtbar ist, WOHIN geschrieben wird. */
export function describeTarget() {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}${u.port ? `:${u.port}` : ""}/${u.pathname.replace(/^\//, "")}`;
  } catch { return "(DATABASE_URL ungültig)"; }
}

/**
 * Schutzschalter:
 *  - demo:  NIEMALS in production; in staging nur mit ALLOW_DEMO_SEED=1.
 *  - base/admin in production: nur mit CONFIRM_PRODUCTION_SEED=yes und nur gegen eine gültig konfigurierte Remote-Datenbank.
 */
export function assertSeedAllowed(kind: SeedKind) {
  const env = appEnv();
  console.log(`Seed „${kind}“ → Umgebung: ${env} · Datenbank: ${describeTarget()}`);
  if (env !== "local") {
    const dbErrors = validateConfig().errors.filter((e) => e.startsWith("DATABASE_URL"));
    if (dbErrors.length) throw new Error(`Abbruch – Datenbank-Konfiguration ungültig:\n  - ${dbErrors.join("\n  - ")}`);
  }
  if (kind === "demo") {
    if (env === "production") throw new Error("Abbruch – Demo-/Testdaten dürfen NIEMALS in die Production-Datenbank.");
    if (env === "staging" && process.env.ALLOW_DEMO_SEED !== "1") throw new Error("Abbruch – Demo-Daten in staging nur mit ALLOW_DEMO_SEED=1.");
  }
  if (env === "production" && process.env.CONFIRM_PRODUCTION_SEED !== "yes")
    throw new Error("Abbruch – Seed gegen Production erfordert CONFIRM_PRODUCTION_SEED=yes (bewusste Bestätigung).");
}
