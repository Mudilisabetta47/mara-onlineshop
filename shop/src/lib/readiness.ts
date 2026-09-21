import { db } from "./db";
import { storage } from "./storage";
import { appEnv, validateConfig } from "./config";
import { getSettings } from "./settings";
import { paypalEnabled, stripeEnabled } from "./env";

const withTimeout = <T,>(p: Promise<T>, ms = 3000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

export type Check = { ok: boolean; ms: number; error?: string };
async function timed(fn: () => Promise<unknown>): Promise<Check> {
  const t = Date.now();
  try { await withTimeout(fn()); return { ok: true, ms: Date.now() - t }; }
  catch (e) { return { ok: false, ms: Date.now() - t, error: (e as Error).message.slice(0, 120) }; }
}

/** Technische Prüfung (Datenbank, Schema/Migrationen, Storage). Gibt keine Secrets zurück. */
export async function technicalChecks() {
  const database = await timed(() => db.$queryRaw`SELECT 1`);
  const schema = database.ok ? await timed(() => db.product.findFirst({ select: { id: true } })) : { ok: false, ms: 0, error: "übersprungen" };
  const migrations = database.ok
    ? await timed(async () => {
        const rows = await db.$queryRaw<{ failed: bigint; total: bigint }[]>`SELECT count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS failed, count(*) AS total FROM _prisma_migrations`;
        if (Number(rows[0].total) === 0) throw new Error("keine Migrationen angewendet");
        if (Number(rows[0].failed) > 0) throw new Error("fehlgeschlagene Migration vorhanden");
      })
    : { ok: false, ms: 0, error: "übersprungen" };
  const store = await timed(() => storage.check());
  return { database, schema, migrations, storage: store };
}

export type Finding = { level: "error" | "warn" | "ok"; text: string };

/** Fachliche Betriebsbereitschaft: Konfiguration, Stammdaten, Demo-Daten, Zahlarten. */
export async function businessReadiness(): Promise<Finding[]> {
  const env = appEnv();
  const f: Finding[] = [];
  const cfg = validateConfig();
  cfg.errors.forEach((t) => f.push({ level: "error", text: `Konfiguration: ${t}` }));
  cfg.warnings.forEach((t) => f.push({ level: "warn", text: `Konfiguration: ${t}` }));

  const s = await getSettings();
  const placeholder = (v: string) => !v || v.includes("[");
  const legalOk = !placeholder(s.legalName) && !placeholder(s.street) && !placeholder(s.postalCode) && !placeholder(s.city) && !/example\.(com|org)/.test(s.email);
  f.push({ level: legalOk ? "ok" : "error", text: legalOk ? "Anbieterdaten (Impressum/Rechnung) gepflegt" : "Anbieterdaten unvollständig (Admin → Einstellungen): Impressum und Rechnungen wären fehlerhaft" });
  if (!s.vatId) f.push({ level: "warn", text: "USt-IdNr. nicht hinterlegt (Pflichtangabe auf Rechnung/Impressum, sofern vorhanden)" });

  const [active, demo, admins, defaultAdmin, methods] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.setting.findUnique({ where: { key: "demo_seed" } }),
    db.user.count({ where: { role: "ADMIN", disabledAt: null } }),
    db.user.count({ where: { role: "ADMIN", email: { endsWith: "@lumi.local" } } }),
    Promise.resolve({ stripe: stripeEnabled(), paypal: paypalEnabled(), bank: Boolean(s.bankIban) }),
  ]);
  f.push({ level: active > 0 ? "ok" : env === "production" ? "error" : "warn", text: active > 0 ? `${active} aktive Produkte` : "Keine aktiven Produkte im Shop" });
  if (demo) f.push({ level: env === "production" ? "error" : "warn", text: "Demo-/Testdaten vorhanden (Seed „demo“) – in Production nicht zulässig (npm run db:purge-demo nur in staging)" });
  f.push({ level: admins > 0 ? "ok" : "error", text: admins > 0 ? `${admins} aktive(r) Administrator(en)` : "Kein Administrator vorhanden" });
  if (defaultAdmin > 0 && env !== "local") f.push({ level: "error", text: "Dev-Admin (@lumi.local) existiert – löschen bzw. E-Mail/Passwort ändern" });
  const anyPay = methods.stripe || methods.paypal || methods.bank;
  f.push({ level: anyPay ? "ok" : "error", text: `Zahlarten: ${[methods.stripe && "Stripe", methods.paypal && "PayPal", methods.bank && "Vorkasse"].filter(Boolean).join(", ") || "keine aktiv"}` });
  return f;
}
