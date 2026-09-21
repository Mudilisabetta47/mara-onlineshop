/**
 * Sucht nach versehentlich eingecheckten Zugangsdaten in allen nicht ignorierten Dateien (git ls-files -co --exclude-standard).
 * Exit 1 bei Fund. Gibt nur Datei/Zeile/Regel aus – niemals den Treffer selbst.
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const files = execSync("git ls-files -co --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean);
const rules = [
  ["Stripe Live-Key", /\b(sk|rk)_live_[A-Za-z0-9]{8,}/],
  ["Stripe Webhook-Secret", /\bwhsec_[A-Za-z0-9]{16,}/],
  ["Stripe Test-Secret-Key", /\bsk_test_[A-Za-z0-9]{16,}/],
  ["AWS Access Key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Resend API-Key", /\bre_[A-Za-z0-9]{20,}\b/],
  ["Private Key", /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ["Upstash/Redis-Token", /\bAX[A-Za-z0-9]{30,}==?\b/],
  ["DB-URL mit Passwort", /postgres(?:ql)?:\/\/[^:\s"'@/]+:(?!(?:PASSWORD|PASS|\*+|xxx+|\$\{|<|USER|change-?me|passwort)\b)[^@\s"'/]{4,}@/i],
];
const bad = [];
for (const f of files) {
  if (/(^|\/)(package-lock\.json|.*\.(webp|png|jpg|jpeg|svg|ico|woff2?))$/.test(f)) continue;
  if (/(^|\/)\.env(\..*)?$/.test(f) && !/\.example$/.test(f)) { bad.push([f, 0, "Env-Datei mit Werten ist nicht ignoriert"]); continue; }
  let text; try { if (statSync(f).size > 400_000) continue; text = readFileSync(f, "utf8"); } catch { continue; }
  if (f.endsWith("scripts/check-secrets.mjs") || f.endsWith("src/lib/config.test.ts")) continue;
  text.split("\n").forEach((line, i) => { for (const [name, re] of rules) if (re.test(line)) bad.push([f, i + 1, name]); });
}
if (bad.length) { console.error("✖ Mögliche Secrets im Repository:"); bad.forEach(([f, l, n]) => console.error(`  ${f}:${l}  ${n}`)); process.exit(1); }
console.log(`✓ Keine Secrets in ${files.length} Dateien gefunden.`);
