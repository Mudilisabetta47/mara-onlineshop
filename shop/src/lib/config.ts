/**
 * Zentrale Umgebungs- und Konfigurationsprüfung.
 *
 * APP_ENV trennt Umgebungen strikt: local | staging | production.
 * Auf Vercel wird sie aus VERCEL_ENV abgeleitet (production → production, preview → staging), falls nicht gesetzt.
 * In staging/production wird beim Serverstart (instrumentation.ts) hart validiert – falsch konfigurierte Deployments
 * starten nicht (z. B. lokale Datenbank, Test-Stripe-Keys in Production, Dateisystem-Storage auf Vercel).
 */
export type AppEnv = "local" | "staging" | "production";

export function appEnv(): AppEnv {
  const e = process.env.APP_ENV;
  if (e === "local" || e === "staging" || e === "production") return e;
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return "local";
}
export const isLocal = () => appEnv() === "local";
export const isLive = () => appEnv() === "production";

export type ConfigReport = { env: AppEnv; errors: string[]; warnings: string[] };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "host.docker.internal"]);

function parseDb(url: string | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/^postgres(ql)?:$/.test(u.protocol)) return null;
    return { host: u.hostname, db: u.pathname.replace(/^\//, ""), params: u.searchParams };
  } catch { return null; }
}

/** Reine Funktion (testbar): prüft ein Env-Objekt. Gibt niemals Werte aus – nur Variablennamen und Hinweise. */
export function validateConfig(e: NodeJS.ProcessEnv = process.env): ConfigReport {
  const errors: string[] = [], warnings: string[] = [];
  const explicit = e.APP_ENV;
  const env: AppEnv = explicit === "local" || explicit === "staging" || explicit === "production" ? explicit
    : e.VERCEL_ENV === "production" ? "production" : e.VERCEL_ENV === "preview" ? "staging" : "local";

  if (e.NODE_ENV === "production" && !explicit && !e.VERCEL_ENV)
    errors.push("APP_ENV fehlt (local | staging | production). Bei NODE_ENV=production muss die Umgebung explizit benannt werden.");
  if (explicit && !["local", "staging", "production"].includes(explicit)) errors.push("APP_ENV ungültig (erlaubt: local, staging, production).");

  const db = parseDb(e.DATABASE_URL);
  if (!db) errors.push("DATABASE_URL fehlt oder ist keine gültige PostgreSQL-URL.");
  if (env === "local") return { env, errors, warnings };

  // ── Datenbank ──
  if (db) {
    if (LOCAL_HOSTS.has(db.host)) errors.push("DATABASE_URL zeigt auf eine lokale Datenbank – in staging/production ist eine eigene gehostete Datenbank Pflicht.");
    if (db.db === "lumi_shop" && env === "production") errors.push("DATABASE_URL verwendet den Namen der lokalen Entwicklungsdatenbank (lumi_shop) – bitte eigene Production-Datenbank verwenden.");
    const ssl = db.params.get("sslmode");
    if (!LOCAL_HOSTS.has(db.host) && !["require", "verify-ca", "verify-full"].includes(ssl ?? "") && db.params.get("ssl") !== "true")
      errors.push("DATABASE_URL: TLS fehlt – bitte ?sslmode=require (oder verify-full) anhängen.");
  }
  if (!e.DIRECT_URL) warnings.push("DIRECT_URL fehlt (direkte, nicht gepoolte Verbindung) – wird für `prisma migrate deploy` benötigt.");

  // ── URL / Cookies ──
  const appUrl = e.NEXT_PUBLIC_APP_URL ?? "";
  if (!/^https:\/\//.test(appUrl) || /localhost|127\.0\.0\.1/.test(appUrl)) errors.push("NEXT_PUBLIC_APP_URL muss die öffentliche https-URL sein (kein localhost).");
  if (env === "production" && /\.vercel\.app/.test(appUrl)) warnings.push("NEXT_PUBLIC_APP_URL zeigt auf *.vercel.app – für den Livegang eine eigene Domain verwenden.");

  // ── Secrets ──
  if (!e.CRON_SECRET || e.CRON_SECRET.length < 24 || /change-?me|dev-cron/i.test(e.CRON_SECRET)) errors.push("CRON_SECRET fehlt/zu schwach (min. 24 zufällige Zeichen).");

  // ── Storage ──
  const driver = e.STORAGE_DRIVER ?? "local";
  if (driver !== "s3" && (e.VERCEL || env === "production"))
    errors.push("STORAGE_DRIVER=s3 ist Pflicht (Vercel-Dateisystem ist flüchtig/schreibgeschützt: Uploads und Rechnungen gingen verloren).");
  if (driver === "s3") for (const k of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) if (!e[k]) errors.push(`${k} fehlt (STORAGE_DRIVER=s3).`);

  // ── E-Mail ──
  if (!e.RESEND_API_KEY) (env === "production" ? errors : warnings).push("RESEND_API_KEY fehlt – Passwort-Reset und Bestellbestätigungen würden nicht zugestellt.");
  if (!e.MAIL_FROM || /example\.(com|org)/.test(e.MAIL_FROM)) (env === "production" ? errors : warnings).push("MAIL_FROM fehlt oder verwendet eine Beispiel-Domain (verifizierte Absender-Domain nötig).");

  // ── Zahlungen ──
  const sk = e.STRIPE_SECRET_KEY, pk = e.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, wh = e.STRIPE_WEBHOOK_SECRET;
  const want = env === "production" ? "live" : "test";
  if (sk || pk) {
    if (!sk || !pk) errors.push("Stripe: STRIPE_SECRET_KEY und NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY müssen gemeinsam gesetzt sein.");
    if (sk && !new RegExp(`^(sk|rk)_${want}_`).test(sk)) errors.push(`Stripe: In ${env} sind ausschließlich ${want}-Schlüssel erlaubt (sk_${want}_…).`);
    if (pk && !new RegExp(`^pk_${want}_`).test(pk)) errors.push(`Stripe: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY muss pk_${want}_… sein.`);
    if (!wh || !wh.startsWith("whsec_")) errors.push("Stripe: STRIPE_WEBHOOK_SECRET (whsec_…) fehlt – ohne Webhook bleiben Zahlungen bei abgebrochenem Rücksprung unbestätigt.");
  }
  if (e.PAYPAL_CLIENT_ID || e.PAYPAL_CLIENT_SECRET) {
    if (!e.PAYPAL_CLIENT_ID || !e.PAYPAL_CLIENT_SECRET) errors.push("PayPal: PAYPAL_CLIENT_ID und PAYPAL_CLIENT_SECRET müssen gemeinsam gesetzt sein.");
    const pp = env === "production" ? "live" : "sandbox";
    if (e.PAYPAL_ENV !== pp) errors.push(`PayPal: PAYPAL_ENV muss in ${env} "${pp}" sein.`);
  }
  if (!sk && !e.PAYPAL_CLIENT_ID) warnings.push("Kein Online-Zahlungsanbieter konfiguriert (Stripe/PayPal) – nur Vorkasse verfügbar.");

  // ── Betrieb ──
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) warnings.push("UPSTASH_REDIS_REST_URL/TOKEN fehlen – Rate-Limiting wirkt nur pro Serverinstanz (Serverless: praktisch kaum).");
  if (e.E2E_ALLOW_REMOTE) warnings.push("E2E_ALLOW_REMOTE ist gesetzt – nur für Staging gedacht.");
  if (e.ADMIN_PASSWORD) warnings.push("ADMIN_PASSWORD ist in der Laufzeit-Umgebung gesetzt – nach dem ersten Admin-Setup entfernen.");
  return { env, errors, warnings };
}

let logged = false;
/** Beim Serverstart aufrufen. In staging/production → Fehler beenden den Start. */
export function assertConfig() {
  const r = validateConfig();
  if (!logged) {
    logged = true;
    r.warnings.forEach((w) => console.warn(`[config:${r.env}] WARN  ${w}`));
  }
  if (r.errors.length && r.env !== "local") {
    r.errors.forEach((x) => console.error(`[config:${r.env}] FEHLER ${x}`));
    throw new Error(`Ungültige ${r.env}-Konfiguration (${r.errors.length} Fehler). Details siehe oben.`);
  }
  return r;
}
