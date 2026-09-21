import test from "node:test";
import assert from "node:assert/strict";
import { validateConfig, resolveDatabaseUrl, parseAppEnv, resolveAppEnv, effectiveAppUrl } from "./config";

const E = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;
const prod = (o: Record<string, string | undefined> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: "production", APP_ENV: "production",
  DATABASE_URL: "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/shop_prod?sslmode=require", DIRECT_URL: "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/shop_prod?sslmode=require",
  NEXT_PUBLIC_APP_URL: "https://www.example-shop.de", CRON_SECRET: "x".repeat(40).replace(/x/g, "a1"),
  STORAGE_DRIVER: "s3", S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s",
  RESEND_API_KEY: "re_x", MAIL_FROM: "Shop <bestellung@shop.de>",
  STRIPE_SECRET_KEY: "sk_live_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
  UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t", ...o,
}) as NodeJS.ProcessEnv;

test("gültige Production-Konfiguration hat keine Fehler", () => assert.deepEqual(validateConfig(prod()).errors, []));
test("lokale Datenbank wird in production abgelehnt", () => {
  const r = validateConfig(prod({ DATABASE_URL: "postgresql://mudilisa@localhost:5432/lumi_shop?schema=public" }));
  assert.ok(r.errors.some((e) => e.includes("lokale Datenbank")));
  assert.ok(r.errors.some((e) => e.includes("lumi_shop")));
});
test("Dev-DB-Name lumi_shop wird auch bei Remote-Host abgelehnt", () =>
  assert.ok(validateConfig(prod({ DATABASE_URL: "postgresql://u:p@db.example.com/lumi_shop?sslmode=require" })).errors.some((e) => e.includes("lumi_shop"))));
test("ohne TLS wird abgelehnt", () => assert.ok(validateConfig(prod({ DATABASE_URL: "postgresql://u:p@db.example.com/shop" })).errors.some((e) => e.includes("TLS"))));
test("Stripe-Testkeys in production verboten, Livekeys in staging verboten", () => {
  assert.ok(validateConfig(prod({ STRIPE_SECRET_KEY: "sk_test_x" })).errors.some((e) => e.includes("live")));
  assert.ok(validateConfig(prod({ APP_ENV: "staging" })).errors.some((e) => e.includes("test")));
});
test("Stripe ohne Webhook-Secret ist ein Fehler", () => assert.ok(validateConfig(prod({ STRIPE_WEBHOOK_SECRET: undefined })).errors.some((e) => e.includes("WEBHOOK"))));
test("Dateisystem-Storage in production verboten", () => assert.ok(validateConfig(prod({ STORAGE_DRIVER: "local" })).errors.some((e) => e.includes("STORAGE_DRIVER"))));
test("staging auf Vercel ohne S3 ist nur eine Warnung (Testbetrieb), production ein Fehler", () => {
  const st = validateConfig(prod({ APP_ENV: "staging", STORAGE_DRIVER: "local", VERCEL: "1", STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" }));
  assert.ok(!st.errors.some((e) => e.includes("STORAGE_DRIVER")) && st.warnings.some((w) => w.includes("STORAGE_DRIVER")));
  assert.ok(validateConfig(prod({ STORAGE_DRIVER: "local", VERCEL: "1" })).errors.some((e) => e.includes("STORAGE_DRIVER")));
});
test("PayPal live/sandbox je Umgebung", () => assert.ok(validateConfig(prod({ PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b", PAYPAL_ENV: "sandbox" })).errors.some((e) => e.includes("PAYPAL_ENV"))));
test("localhost-URL und Mail-Beispieldomain abgelehnt", () => {
  const r = validateConfig(prod({ NEXT_PUBLIC_APP_URL: "http://localhost:3000", MAIL_FROM: "x <a@example.com>" }));
  assert.ok(r.errors.some((e) => e.includes("NEXT_PUBLIC_APP_URL")) && r.errors.some((e) => e.includes("MAIL_FROM")));
});
test("NODE_ENV=production ohne APP_ENV ist ein Fehler; local ist locker", () => {
  assert.ok(validateConfig({ NODE_ENV: "production", DATABASE_URL: "postgresql://u@localhost/x" } as NodeJS.ProcessEnv).errors.some((e) => e.includes("APP_ENV")));
  assert.equal(validateConfig({ NODE_ENV: "development", APP_ENV: "local", DATABASE_URL: "postgresql://u@localhost/lumi_shop" } as NodeJS.ProcessEnv).errors.length, 0);
});
test("Fehlermeldungen enthalten keine Werte", () => {
  const r = validateConfig(prod({ DATABASE_URL: "postgresql://geheim:passwort123@localhost/lumi_shop", STRIPE_SECRET_KEY: "sk_test_GEHEIM" }));
  assert.ok(![...r.errors, ...r.warnings].join(" ").match(/passwort123|GEHEIM/));
});

test("resolveDatabaseUrl: Neon-Pooler bekommt pgbouncer=true + connect_timeout, bestehende Parameter/Passwort bleiben", () => {
  const u = resolveDatabaseUrl(E({ DATABASE_URL: "postgresql://user:p%40ss@ep-cool-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" }))!;
  assert.ok(u.startsWith("postgresql://user:p%40ss@ep-cool-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&"));
  assert.ok(u.includes("pgbouncer=true") && u.includes("connect_timeout=15"));
});
test("resolveDatabaseUrl: direkte URL bleibt ohne pgbouncer; nichts wird doppelt ergänzt", () => {
  const direct = "postgresql://u:p@ep-cool-123.eu-central-1.aws.neon.tech/db?sslmode=require";
  const r = resolveDatabaseUrl(E({ DATABASE_URL: direct }))!;
  assert.ok(!r.includes("pgbouncer") && r.includes("connect_timeout=15"));
  const again = resolveDatabaseUrl(E({ DATABASE_URL: r }));
  assert.equal(again, r);
  const pooled = "postgresql://u:p@x-pooler.neon.tech/db?sslmode=require&pgbouncer=true&connect_timeout=15";
  assert.equal(resolveDatabaseUrl(E({ DATABASE_URL: pooled })), pooled);
});
test("resolveDatabaseUrl: lokale URL unverändert; Fallback auf POSTGRES_PRISMA_URL/POSTGRES_URL", () => {
  assert.equal(resolveDatabaseUrl(E({ DATABASE_URL: "postgresql://u@localhost:5432/lumi_shop?schema=public" })), "postgresql://u@localhost:5432/lumi_shop?schema=public");
  assert.ok(resolveDatabaseUrl(E({ POSTGRES_PRISMA_URL: "postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=require" }))!.includes("pgbouncer=true"));
  assert.equal(resolveDatabaseUrl(E({})), undefined);
});
test("validateConfig akzeptiert die Vercel-Neon-Variablen (POSTGRES_URL statt DATABASE_URL)", () => {
  const r = validateConfig(prod({ DATABASE_URL: undefined, POSTGRES_URL: "postgresql://u:p@ep-x-pooler.eu.neon.tech/shop?sslmode=require" }));
  assert.ok(!r.errors.some((e) => e.includes("DATABASE_URL")));
});

test("APP_ENV wird tolerant gelesen (Anführungszeichen, Leerzeichen, Großschreibung)", () => {
  for (const raw of ['"staging"', "'staging'", " Staging ", "STAGING", '"staging" ']) assert.equal(parseAppEnv(raw), "staging", raw);
  assert.equal(parseAppEnv(""), undefined);
  assert.equal(parseAppEnv("prod"), undefined);
});
test("VERCEL_ENV=production übersteuert ein gültiges APP_ENV=staging NICHT (Vorrang APP_ENV), warnt aber", () => {
  const r = resolveAppEnv(E({ APP_ENV: "staging", VERCEL_ENV: "production" }));
  assert.deepEqual(r, { env: "staging", source: "APP_ENV" });
  assert.ok(validateConfig(prod({ APP_ENV: "staging", VERCEL_ENV: "production", STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" })).warnings.some((w) => w.includes("Production-Deployment läuft mit APP_ENV=staging")));
});
test("ohne gültiges APP_ENV wird aus VERCEL_ENV abgeleitet und der Grund gemeldet", () => {
  assert.deepEqual(resolveAppEnv(E({ VERCEL_ENV: "preview" })), { env: "staging", source: "VERCEL_ENV" });
  const bad = validateConfig(prod({ APP_ENV: "stagng", VERCEL_ENV: "production" }));
  assert.equal(bad.env, "production");
  assert.equal(bad.envSource, "VERCEL_ENV");
  assert.ok(bad.appEnvNote.includes("ungültig") && bad.errors.some((e) => e.includes("APP_ENV ist gesetzt, aber ungültig")));
  assert.ok(validateConfig(prod({ APP_ENV: undefined, VERCEL_ENV: "production" })).appEnvNote.includes("nicht gesetzt"));
});
test("Preview-Deployment darf nie als production laufen", () => {
  assert.ok(validateConfig(prod({ APP_ENV: "production", VERCEL_ENV: "preview" })).errors.some((e) => e.includes("Preview-Deployment")));
  assert.equal(validateConfig(prod({ APP_ENV: undefined, VERCEL_ENV: "preview", STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" })).env, "staging");
});
test("effectiveAppUrl: Preview leitet die stabile Branch-URL ab; explizite Variable hat Vorrang", () => {
  assert.equal(effectiveAppUrl(E({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "shop-git-staging-team.vercel.app", VERCEL_URL: "shop-abc123.vercel.app" })), "https://shop-git-staging-team.vercel.app");
  assert.equal(effectiveAppUrl(E({ VERCEL_ENV: "preview", VERCEL_URL: "shop-abc123.vercel.app" })), "https://shop-abc123.vercel.app");
  assert.equal(effectiveAppUrl(E({ NEXT_PUBLIC_APP_URL: "https://www.example.de/", VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "x.vercel.app" })), "https://www.example.de");
  assert.equal(effectiveAppUrl(E({})), "http://localhost:3000");
  // Staging-Preview ohne NEXT_PUBLIC_APP_URL ist gültig
  const ok = validateConfig(prod({ APP_ENV: undefined, NEXT_PUBLIC_APP_URL: undefined, VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "shop-git-staging-team.vercel.app", STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" }));
  assert.deepEqual(ok.errors, []);
});
