#!/usr/bin/env node
/**
 * Staging-Datenbank (Neon) sicher füllen:  npm run seed:staging
 *
 * Ablauf: Neon-URL verdeckt abfragen → Ziel prüfen (Host/DB-Name, keine Zugangsdaten) → Migrationen prüfen/anwenden →
 * Demo-Seed → Admin anlegen → Ergebnis in der Datenbank prüfen → optional Staging-URL prüfen (/api/health, /shop).
 *
 * Schutz: verweigert lokale Hosts, die Entwicklungsdatenbank „lumi_shop“ und Datenbanknamen mit „prod“.
 * Zugangsdaten werden nie ausgegeben, nie in Dateien geschrieben und nur an die Kindprozesse dieses Laufs übergeben.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import readline from "node:readline";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";

// „prod“/„production“ als eigenes Namensteil (nicht z. B. in „product“)
const PROD_LIKE = /(^|[-_.])prod(uction)?([-_.]|$)/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "host.docker.internal"]);

/** Zerlegt die URL OHNE Zugangsdaten preiszugeben. Gibt eine für Migrationen/Seeds geeignete DIREKTE URL zurück. */
export function parseTarget(raw, { allowLocal = false, allowNonNeon = false } = {}) {
  const m = String(raw ?? "").trim().match(/^(postgres(?:ql)?):\/\/([^:@/]+)(?::([^@/]*))?@([^:/?#]+)(?::(\d+))?\/([^?#]*)(?:\?(.*))?$/i);
  if (!m) return { ok: false, error: "Das ist keine gültige PostgreSQL-URL (postgresql://benutzer:passwort@host/datenbank?…)." };
  const [, proto, user, pass, hostRaw, port, db, query = ""] = m;
  const host = hostRaw.toLowerCase();
  if (!allowLocal && LOCAL_HOSTS.has(host)) return { ok: false, error: `Abbruch: Host „${host}“ ist lokal. Hier darf nur die gehostete Staging-Datenbank verwendet werden.` };
  if (!allowLocal && db === "lumi_shop") return { ok: false, error: "Abbruch: „lumi_shop“ ist die lokale Entwicklungsdatenbank." };
  if (PROD_LIKE.test(db) || PROD_LIKE.test(host)) return { ok: false, error: `Abbruch: „${db}“ sieht nach Production aus. Dieses Skript füllt ausschließlich die Staging-Datenbank.` };
  if (!allowLocal && !allowNonNeon && !/\.neon\.tech$/.test(host)) return { ok: false, error: `Abbruch: Host „${host}“ ist kein Neon-Host (*.neon.tech). Mit --allow-non-neon bewusst freigeben.` };

  const pooled = /-pooler(\.|$)/.test(host);
  const directHost = pooled ? hostRaw.replace(/-pooler/i, "") : hostRaw;
  // Direkte Verbindung: kein Pooler-Parameter, kein channel_binding (kann Prisma-Migrationen stören), TLS erzwingen
  const params = query.split("&").filter((p) => p && !/^(pgbouncer|channel_binding)=/i.test(p));
  if (!params.some((p) => /^sslmode=/i.test(p)) && !LOCAL_HOSTS.has(host)) params.push("sslmode=require");
  const direct = `${proto}://${user}${pass !== undefined ? `:${pass}` : ""}@${directHost}${port ? `:${port}` : ""}/${db}${params.length ? `?${params.join("&")}` : ""}`;
  return { ok: true, host: directHost.toLowerCase(), db, pooledInput: pooled, direct };
}

/** Entfernt alles, was wie eine Verbindungs-URL aussieht, aus Fehlertexten. */
export const scrub = (s) => String(s).replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const originalWrite = rl._writeToOutput.bind(rl);
    if (hidden) {
      rl._writeToOutput = () => {};
      process.stdout.write(question);
    }
    rl.question(hidden ? "" : question, (a) => {
      rl._writeToOutput = originalWrite;
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

const sh = (cmd, env, opts = {}) => spawnSync(cmd, { shell: true, encoding: "utf8", env: { ...process.env, ...env }, stdio: opts.inherit ? ["ignore", "inherit", "inherit"] : "pipe" });
const ok = (c, m) => { console.log(`  ${c ? "✓" : "✖"} ${m}`); return !!c; };

/** Kernablauf (exportiert, damit er ohne Prompts testbar ist). */
export async function runFlow({ direct, appEnv = "staging", adminEmail, adminPassword, stagingUrl }) {
  const env = { APP_ENV: appEnv, ALLOW_DEMO_SEED: "1", DATABASE_URL: direct, DIRECT_URL: direct, ADMIN_EMAIL: adminEmail ?? "", ADMIN_PASSWORD: adminPassword ?? "" };
  let failed = 0;

  console.log("\n1) Migrationen");
  let st = sh("npx prisma migrate status", env);
  if (st.status !== 0 || !/up to date/i.test(st.stdout + st.stderr)) {
    console.log("  → Migrationen fehlen oder sind ausstehend – wende sie an (prisma migrate deploy) …");
    const dep = sh("npx prisma migrate deploy", env);
    if (!ok(dep.status === 0, "prisma migrate deploy")) { console.error(scrub(dep.stdout + dep.stderr).split("\n").slice(-8).join("\n")); return 1; }
    st = sh("npx prisma migrate status", env);
  }
  if (!ok(/up to date/i.test(st.stdout + st.stderr), "Datenbankschema ist aktuell (alle Migrationen angewendet)")) failed++;

  console.log("\n2) Demo-Seed (Kategorien, Marken, Demo-Produkte, Varianten, Bestand, Test-Gutscheine)");
  const demo = sh("npx tsx prisma/seed/index.ts demo", env);
  console.log(scrub(demo.stdout).split("\n").filter((l) => /✓|•|Abbruch|Seed/.test(l)).map((l) => "  " + l).join("\n"));
  if (!ok(demo.status === 0, "Demo-Seed")) { console.error(scrub(demo.stderr || demo.stdout).split("\n").slice(-6).join("\n")); return 1; }

  if (adminEmail && adminPassword) {
    console.log("\n3) Admin");
    const adm = sh("npx tsx prisma/seed/index.ts admin", env);
    console.log(scrub(adm.stdout).split("\n").filter((l) => /✓|•|Abbruch/.test(l)).map((l) => "  " + l).join("\n"));
    if (!ok(adm.status === 0, "Admin-Seed")) { console.error(scrub(adm.stderr || adm.stdout).split("\n").slice(-6).join("\n")); return 1; }
  }

  console.log("\n4) Prüfung in der Datenbank");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: direct });
  let firstSlug = null;
  try {
    const [cats, brands, prods, actives, variants, inv, invSum, admins, demoFlag, orders, migs] = await Promise.all([
      db.category.count(), db.brand.count(), db.product.count(), db.product.count({ where: { status: "ACTIVE" } }), db.productVariant.count(),
      db.inventory.count(), db.inventory.aggregate({ _sum: { quantity: true } }), db.user.count({ where: { role: "ADMIN" } }),
      db.setting.findUnique({ where: { key: "demo_seed" } }), db.order.count(), db.$queryRaw`SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
    ]);
    firstSlug = (await db.product.findFirst({ where: { status: "ACTIVE" }, orderBy: { soldCount: "desc" }, select: { slug: true } }))?.slug ?? null;
    if (!ok(cats >= 4, `Kategorien: ${cats}`)) failed++;
    if (!ok(brands >= 1, `Marken: ${brands}`)) failed++;
    if (!ok(actives >= 1, `Produkte: ${prods} (davon aktiv: ${actives})`)) failed++;
    if (!ok(variants >= 1, `Produktvarianten: ${variants}`)) failed++;
    if (!ok(inv >= 1, `Inventar-Einträge: ${inv} (Gesamtbestand: ${invSum._sum.quantity ?? 0} Stück)`)) failed++;
    if (adminEmail) { if (!ok(admins >= 1, `Administratoren: ${admins}`)) failed++; } else console.log(`  • Administratoren: ${admins} (Admin-Schritt übersprungen)`);
    console.log(`  • Angewendete Migrationen: ${migs[0].n} · Demo-Markierung: ${demoFlag ? "ja" : "nein"} · vorhandene Bestellungen: ${orders}`);
  } catch (e) { ok(false, "Datenbankprüfung: " + scrub(e.message).split("\n").pop()); failed++; }
  finally { await db.$disconnect(); }

  if (stagingUrl) {
    console.log("\n5) Staging-URL");
    const base = stagingUrl.replace(/\/$/, "");
    try {
      const h = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(20000) });
      if (h.status === 401 || h.status === 403) console.log(`  • /api/health → HTTP ${h.status}: Vercel Authentication schützt die Preview-URL. Bitte im Browser (bei Vercel eingeloggt) öffnen.`);
      else { const j = await h.json().catch(() => ({})); if (!ok(h.ok && j.status === "ok", `/api/health → HTTP ${h.status} ${j.status ?? ""} ${JSON.stringify(j.checks ?? {})}`)) failed++; }
      const s = await fetch(`${base}/shop`, { signal: AbortSignal.timeout(30000) });
      if (s.status === 401 || s.status === 403) console.log(`  • /shop → HTTP ${s.status} (geschützt, siehe oben)`);
      else { const t = await s.text(); if (!ok(s.ok && firstSlug && t.includes(`/product/${firstSlug}`), `/shop → HTTP ${s.status}, zeigt Produkte: ${firstSlug && t.includes(`/product/${firstSlug}`) ? "ja" : "nein"}`)) failed++; }
    } catch (e) { ok(false, "Staging-URL nicht erreichbar: " + scrub(e.message)); failed++; }
  }
  return failed ? 1 : 0;
}

async function main() {
  const allowNonNeon = process.argv.includes("--allow-non-neon");
  console.log("Staging-Datenbank füllen (Neon) – Zugangsdaten werden nicht angezeigt oder gespeichert.\n");
  console.log("Neon-Konsole → Projekt → „Connect“ → „Connection pooling“ AUS → Connection String kopieren (mit Passwort).");
  const raw = await ask("Neon-URL (direkt, ohne -pooler; Eingabe bleibt unsichtbar): ", { hidden: true });
  const t = parseTarget(raw, { allowNonNeon });
  if (!t.ok) { console.error("\n✖ " + t.error); process.exit(1); }
  console.log(`\nZiel:  Host ${t.host}  ·  Datenbank „${t.db}“${t.pooledInput ? "  (Pooler-Host erkannt → nutze die direkte Verbindung)" : ""}`);
  const c1 = await ask("Ist das die STAGING-Datenbank (nicht Production, nicht lokal)? Zum Bestätigen „staging“ tippen: ");
  if (c1 !== "staging") { console.error("Abgebrochen."); process.exit(1); }

  const adminEmail = (await ask("Admin-E-Mail (Enter = Admin-Schritt überspringen): ")).toLowerCase();
  let adminPassword = "";
  if (adminEmail) {
    adminPassword = await ask("Admin-Passwort (min. 14 Zeichen mit Groß-/Kleinbuchstaben und Ziffern; Enter = zufälliges erzeugen): ", { hidden: true });
    if (!adminPassword) { adminPassword = `Ll-${randomBytes(9).toString("base64url")}-9a`; console.log(`\nErzeugtes Admin-Passwort (nur jetzt sichtbar, bitte notieren): ${adminPassword}`); }
  }
  const stagingUrl = await ask("\nStaging-URL zum Gegenprüfen (Enter = überspringen): ");
  process.exit(await runFlow({ direct: t.direct, appEnv: "staging", adminEmail, adminPassword, stagingUrl }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((e) => { console.error("✖", scrub(e.message)); process.exit(1); }).finally(() => rl.close());
