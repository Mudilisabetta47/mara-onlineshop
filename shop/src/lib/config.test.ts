import test from "node:test";
import assert from "node:assert/strict";
import { validateConfig } from "./config";

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
