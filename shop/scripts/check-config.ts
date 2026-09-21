/** Prüft die AKTUELLE Umgebung (z. B. nach `vercel env pull`) gegen die Production-Regeln. Gibt keine Werte aus. */
import { validateConfig } from "../src/lib/config";
import { describeTarget } from "../prisma/seed/guard";
const r = validateConfig();
console.log(`Umgebung: ${r.env} · Datenbank: ${describeTarget()}`);
r.errors.forEach((e) => console.log(`  ✖ ${e}`));
r.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
if (!r.errors.length) console.log(r.env === "local" ? "  ✓ lokal – keine Pflichtprüfung" : "  ✓ keine Fehler");
process.exit(r.errors.length && r.env !== "local" ? 1 : 0);
