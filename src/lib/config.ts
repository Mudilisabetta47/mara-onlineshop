/**
 * Zentrale Umgebungs- und Konfigurationsprüfung.
 *
 * APP_ENV trennt Umgebungen strikt: local | staging | production.
 * Auf Vercel wird sie aus VERCEL_ENV abgeleitet (production → production, preview → staging), falls nicht gesetzt.
 * In staging/production wird beim Serverstart (instrumentation.ts) hart validiert – falsch konfigurierte Deployments
 * starten nicht (z. B. lokale Datenbank, Test-Stripe-Keys in Production, Dateisystem-Storage auf Vercel).
 */
export type AppEnv = "local" | "staging" | "production";

/**
 * Tolerantes Lesen von APP_ENV: Leerzeichen, Groß-/Kleinschreibung und umschließende Anführungszeichen werden ignoriert
 * (in der Vercel-Oberfläche werden Anführungszeichen wörtlich gespeichert – typischer Kopierfehler aus .env-Dateien).
 */
export function parseAppEnv(raw: string | undefined): AppEnv | undefined {
  const v = (raw ?? "").trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase();
  return v === "local" || v === "staging" || v === "production" ? v : undefined;
}

/** Vorrang: gültiges APP_ENV › VERCEL_ENV (production → production, preview → staging) › local. VERCEL_ENV übersteuert NIE ein gültiges APP_ENV. */
export function resolveAppEnv(e: NodeJS.ProcessEnv = process.env): { env: AppEnv; source: "APP_ENV" | "VERCEL_ENV" | "default" } {
  const explicit = parseAppEnv(e.APP_ENV);
  if (explicit) return { env: explicit, source: "APP_ENV" };
  if (e.VERCEL_ENV === "production") return { env: "production", source: "VERCEL_ENV" };
  if (e.VERCEL_ENV === "preview") return { env: "staging", source: "VERCEL_ENV" };
  return { env: "local", source: "default" };
}

export const appEnv = (): AppEnv => resolveAppEnv().env;

/**
 * Öffentliche Basis-URL: NEXT_PUBLIC_APP_URL, sonst (Vercel) die stabile Branch-URL bzw. Deployment-URL.
 * So braucht ein Preview/Staging-Deployment keine feste URL-Variable.
 */
export function effectiveAppUrl(e: NodeJS.ProcessEnv = process.env): string {
  const explicit = (e.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const host = e.VERCEL_ENV === "preview" ? e.VERCEL_BRANCH_URL || e.VERCEL_URL : e.VERCEL_PROJECT_PRODUCTION_URL || e.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}
export const isLocal = () => appEnv() === "local";
export const isLive = () => appEnv() === "production";

export type ConfigReport = {
  env: AppEnv;
  /** Woher die Umgebung stammt – erklärt „warum production?“ ohne Werte zu verraten */
  envSource: "APP_ENV" | "VERCEL_ENV" | "default";
  /** Hinweis zu APP_ENV (nur Beschreibung, nie der Wert) */
  appEnvNote: string;
  errors: string[];
  warnings: string[];
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "host.docker.internal"]);

/**
 * Liefert die Datenbank-URL für den Prisma-Client. Reihenfolge: DATABASE_URL → POSTGRES_PRISMA_URL → POSTGRES_URL
 * (Namen der Vercel-Neon-/Supabase-Integration). Bei einem Neon-/PgBouncer-Pooler (Host enthält „-pooler“ bzw. „pooler“)
 * wird `pgbouncer=true` ergänzt (Prisma nutzt dann keine serverseitigen Prepared Statements, die der Pooler im
 * Transaction-Mode nicht sicher unterstützt) und für Remote-Hosts `connect_timeout=15`, falls nicht gesetzt.
 * Reine String-Ergänzung – bestehende Parameter und das Passwort bleiben unverändert.
 */
export function resolveDatabaseUrl(e: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = e.DATABASE_URL || e.POSTGRES_PRISMA_URL || e.POSTGRES_URL;
  if (!raw) return undefined;
  const m = raw.match(/^postgres(?:ql)?:\/\/(?:[^@/]*@)?([^:/?#]+)/i);
  if (!m) return raw;
  const host = m[1].toLowerCase();
  const add: string[] = [];
  if (/pooler/.test(host) && !/[?&]pgbouncer=/.test(raw)) add.push("pgbouncer=true");
  if (!LOCAL_HOSTS.has(host) && !/[?&]connect_timeout=/.test(raw)) add.push("connect_timeout=15");
  if (!add.length) return raw;
  return raw + (raw.includes("?") ? "&" : "?") + add.join("&");
}

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
  const { env, source } = resolveAppEnv(e);
  const rawSet = (e.APP_ENV ?? "").trim() !== "";
  const validApp = parseAppEnv(e.APP_ENV);
  const appEnvNote = validApp ? `APP_ENV gesetzt (${validApp})` : rawSet ? "APP_ENV ist gesetzt, aber ungültig (erlaubt: local, staging, production)" : "APP_ENV ist in dieser Umgebung nicht gesetzt";

  if (e.NODE_ENV === "production" && !validApp && !e.VERCEL_ENV)
    errors.push("APP_ENV fehlt (local | staging | production). Bei NODE_ENV=production muss die Umgebung explizit benannt werden.");
  if (rawSet && !validApp) errors.push("APP_ENV ist gesetzt, aber ungültig (erlaubt: local, staging, production – ohne Anführungszeichen). Ohne gültigen Wert wird die Umgebung aus VERCEL_ENV abgeleitet.");
  // Trennung Preview ↔ Production: ein Preview-Deployment darf nie als Production laufen (echte Zahlungen/Live-Daten)
  if (e.VERCEL_ENV === "preview" && env === "production") errors.push("Preview-Deployment mit APP_ENV=production: verboten – Previews sind immer staging (APP_ENV im Scope „Preview“ auf staging setzen oder entfernen).");
  if (e.VERCEL_ENV === "production" && env === "staging") warnings.push("Das Vercel-Production-Deployment läuft mit APP_ENV=staging (Testbetrieb). Für den Livegang APP_ENV entfernen bzw. auf production setzen.");

  const db = parseDb(e.DATABASE_URL || e.POSTGRES_PRISMA_URL || e.POSTGRES_URL);
  if (!db) errors.push("DATABASE_URL fehlt oder ist keine gültige PostgreSQL-URL.");
  const head = { env, envSource: source, appEnvNote };
  if (env === "local") return { ...head, errors, warnings };

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
  const appUrl = effectiveAppUrl(e);
  if (!/^https:\/\//.test(appUrl) || /localhost|127\.0\.0\.1/.test(appUrl)) errors.push("NEXT_PUBLIC_APP_URL muss die öffentliche https-URL sein (kein localhost). Auf Vercel-Previews wird sie automatisch aus VERCEL_BRANCH_URL abgeleitet.");
  if (env === "production" && /\.vercel\.app/.test(appUrl)) warnings.push("NEXT_PUBLIC_APP_URL zeigt auf *.vercel.app – für den Livegang eine eigene Domain verwenden.");

  // ── Secrets ──
  if (!e.CRON_SECRET || e.CRON_SECRET.length < 24 || /change-?me|dev-cron/i.test(e.CRON_SECRET)) errors.push("CRON_SECRET fehlt/zu schwach (min. 24 zufällige Zeichen).");

  // ── Storage ──
  const driver = e.STORAGE_DRIVER ?? "local";
  if (driver !== "s3" && (e.VERCEL || env === "production")) {
    const msg = "STORAGE_DRIVER=s3 ist Pflicht (Vercel-Dateisystem ist flüchtig/schreibgeschützt: Uploads und Rechnungen gingen verloren).";
    // Production: harter Fehler. Staging-Testlauf auf Vercel: Warnung – Shop ist nutzbar, Uploads/Rechnungs-PDFs funktionieren dort aber nicht.
    (env === "production" ? errors : warnings).push(env === "production" ? msg : msg.replace("ist Pflicht", "fehlt") + " (Staging: nur Testbetrieb ohne Uploads/Rechnungen)");
  }
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
  return { ...head, errors, warnings };
}

let logged = false;
/**
 * Beim Serverstart aufrufen: schreibt Fehler/Warnungen ins Log – wirft aber NICHT.
 * Durchgesetzt wird die Konfiguration in `src/middleware.ts`: Ist sie in staging/production ungültig, antwortet der Shop
 * mit einem lesbaren 503 statt mit einem unverständlichen Absturz (500) der ganzen Server-Funktion.
 */
export function logConfig() {
  const r = validateConfig();
  if (!logged) {
    logged = true;
    r.warnings.forEach((w) => console.warn(`[config:${r.env}] WARN  ${w}`));
    r.errors.forEach((x) => console.error(`[config:${r.env}] FEHLER ${x}`));
  }
  return r;
}
