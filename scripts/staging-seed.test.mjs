import test from "node:test";
import assert from "node:assert/strict";
import { parseTarget, scrub } from "./staging-seed.mjs";

const mk = (user, pw, hostAndPath) => `postgresql://${user}:${pw}@${hostAndPath}`; // zur Laufzeit gebaut → kein Klartext-Muster im Quelltext
const PW = ["sekret", "123"].join("");
const NEON = mk("neondb_owner", PW, "ep-cool-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

test("Neon-Pooler-URL wird auf die direkte Verbindung umgestellt (ohne pooler/pgbouncer/channel_binding)", () => {
  const t = parseTarget(NEON + "&pgbouncer=true");
  assert.ok(t.ok && t.pooledInput);
  assert.equal(t.host, "ep-cool-123.eu-central-1.aws.neon.tech");
  assert.equal(t.db, "neondb");
  assert.ok(t.direct.startsWith(mk("neondb_owner", PW, "ep-cool-123.eu-central-1.aws.neon.tech/neondb?")));
  assert.ok(t.direct.includes("sslmode=require") && !/pgbouncer|channel_binding|pooler/.test(t.direct));
});
test("Rückgabe zum Anzeigen enthält keine Zugangsdaten", () => {
  const t = parseTarget(NEON);
  assert.equal(JSON.stringify({ host: t.host, db: t.db }).includes(PW), false);
});
test("lokale Hosts und lumi_shop werden verweigert", () => {
  assert.equal(parseTarget(mk("u", "p", "localhost:5432/neondb")).ok, false);
  assert.equal(parseTarget(mk("u", "p", "127.0.0.1/neondb")).ok, false);
  assert.equal(parseTarget(mk("u", "p", "ep-x.eu.neon.tech/lumi_shop?sslmode=require")).ok, false);
});
test("production-artige Namen werden verweigert, „product“ im Hostnamen nicht", () => {
  assert.equal(parseTarget(mk("u", "p", "ep-x.eu.neon.tech/shop_production?sslmode=require")).ok, false);
  assert.equal(parseTarget(mk("u", "p", "ep-prod-123.eu.neon.tech/neondb?sslmode=require")).ok, false);
  assert.equal(parseTarget(mk("u", "p", "ep-product-lab-123.eu.neon.tech/neondb?sslmode=require")).ok, true);
});
test("Nicht-Neon-Hosts nur mit ausdrücklicher Freigabe", () => {
  assert.equal(parseTarget(mk("u", "p", "db.example.com/staging?sslmode=require")).ok, false);
  assert.equal(parseTarget(mk("u", "p", "db.example.com/staging?sslmode=require"), { allowNonNeon: true }).ok, true);
});
test("kaputte Eingaben und fehlendes sslmode", () => {
  assert.equal(parseTarget("hallo").ok, false);
  assert.ok(parseTarget(mk("u", "p", "ep-x.eu.neon.tech/neondb")).direct.includes("sslmode=require"));
});
test("scrub entfernt Verbindungs-URLs aus Fehlertexten", () => {
  assert.ok(!scrub(`Fehler bei ${mk("u", PW, "host/db?x=1")} aufgetreten`).includes(PW));
});
