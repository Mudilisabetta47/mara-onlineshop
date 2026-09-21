# Go-Live-Checkliste: LOCAL → STAGING → PRODUCTION

Legende: ✅ erledigt und verifiziert · 🟡 im Code vorbereitet, aber noch nicht gegen den echten Dienst getestet · ⬜ offen (du musst handeln)

Stand: 2026-09-21. Ich konnte **kein** Vercel-, Neon-, Stripe-, PayPal-, Resend-, Upstash- oder Cloudflare-Konto anlegen oder anfassen – alles, was ein solches Konto braucht, ist deshalb ⬜ bzw. 🟡. Alles Codeseitige und lokal Prüfbare ist ✅.

---

## 1 · LOCAL (Entwicklungsrechner)

| # | Punkt | Status | Nachweis / Was du noch tun musst |
|---|---|---|---|
| L1 | Eigene lokale DB `lumi_shop`, nur für den Shop | ✅ | Postgres.app, `prisma migrate status` = up to date |
| L2 | `DATABASE_URL` nur per Umgebung, keine Zugangsdaten im Repo | ✅ | `.env` ignoriert; `npm run check:secrets` → 0 Funde (Scanner mit Attrappen getestet) |
| L3 | Migrationen versioniert (`prisma/migrations`) | ✅ | 1 Baseline-Migration, `directUrl` + `binaryTargets` (Vercel) gesetzt |
| L4 | Seed strukturiert (base / demo / admin) mit Schutzschaltern | ✅ | Guards praktisch getestet: Demo → Production ✗, lokale DB → Production ✗, schwaches Admin-PW ✗, ohne Bestätigung ✗ |
| L5 | Kompletter Kaufprozess | ✅ | `npm run e2e`: **91/91** (Warenkorb, Gutschein, Checkout, Bezahlt, Bestand, Rechnung, Überverkauf, Ablauf, Konto, Admin, Health) |
| L6 | Unit-Tests | ✅ | `npm test`: **20/20** (Geld, Gutscheine, Konfigurationsregeln) |
| L7 | Typecheck + Produktions-Build | ✅ | `tsc` sauber, `next build` erfolgreich |
| L8 | Konfig-Wächter startet Production nicht bei Fehlkonfiguration | ✅ | Test: `APP_ENV=production` + lokale DB → Serverstart bricht mit 7 Fehlern ab |
| L9 | Health Check | ✅ | `/api/health` 200 `ok`; Details nur mit Token; Storage-Ausfall → `degraded` getestet |
| L10 | S3-Storage-Driver | 🟡 | put/get/remove/check gegen S3-Mock ✅; **gegen echten Bucket noch nicht** → STAGING S4 |
| L11 | Backup + Restore | ✅ | `scripts/backup-db.sh` → Restore in Wegwerf-DB: 24/7/5 Datensätze identisch |
| L12 | Sessions/Auth-Härtung | ✅ | Admin-Session 12 h (verifiziert in DB), `__Host-`-Cookies in Production, Rate-Limits async |
| L13 | Login/Passwort-Reset im Browser | ✅ | Login, falsches Passwort, Reset-Link (Konsole) getestet |
| L14 | Abhängigkeiten geprüft | 🟡 | `sharp` auf 0.35.4 aktualisiert (läuft mit Next). Rest: PostCSS (in Next) & Prisma-CLI-Hinweise, nur Build-Werkzeuge → Next-16-Update später einplanen |
| L15 | Stripe/PayPal gegen echte Testumgebungen | ⬜ | Optional lokal: Test-Keys in `.env`, `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. (Wird in STAGING ohnehin getestet) |
| L16 | Mobile Geräte real testen | ⬜ | iPhone/Android: Checkout, Filter-Sheet, Galerie-Swipe (Emulation ✅, echte Geräte offen) |

---

## 2 · STAGING (Vercel „Preview“ + eigene Staging-Datenbank)

Zweck: alles mit **Testschlüsseln** und **Testdaten** durchspielen, ohne die Live-Daten zu berühren. Werte kommen aus `.env.staging.example` in Vercel → Environment Variables → Scope **Preview**.

| # | Punkt | Status | Was du konfigurieren musst |
|---|---|---|---|
| S1 | Staging-Datenbank (`shop_staging`) anlegen | ⬜ | Neon/Supabase-Projekt EU; **gepoolte** URL → `DATABASE_URL`, **direkte** → `DIRECT_URL` (beide `sslmode=require`). Nie dieselbe wie Production |
| S2 | Vercel-Projekt anlegen | ⬜ | Repo verbinden, **Root Directory `shop`**, Node 22, Pro-Plan (Cron, kommerziell) |
| S3 | Env-Variablen Scope *Preview* | ⬜ | `APP_ENV=staging`, DB-URLs, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` (`openssl rand -hex 32`), Storage, Stripe-**Test**, PayPal-**Sandbox**, Resend, Upstash |
| S4 | Staging-Bucket (privat) | ⬜ | S3/R2-Bucket + Schlüssel nur für diesen Bucket → `S3_*`. Danach prüfen: Bild hochladen (Admin), Testkauf → Rechnung öffnen (beides landet im Bucket) |
| S5 | Erster Deploy + automatische Migration | 🟡 | Build-Skript vorbereitet (`migrate deploy` über `DIRECT_URL`). Erster Lauf offen |
| S6 | Staging seeden | ⬜ | `db:seed:base`, `db:seed:admin` (starkes Passwort), optional `ALLOW_DEMO_SEED=1 db:seed:demo` |
| S7 | Konfiguration prüfen | ⬜ | `npm run check:config` mit Staging-Werten; `/api/health?detail=1` (Bearer `CRON_SECRET`) ohne Fehler |
| S8 | Stripe-Test-Webhook | ⬜ | Dashboard (Testmodus) → Webhook `https://staging…/api/webhooks/stripe`, Events `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` → `STRIPE_WEBHOOK_SECRET` |
| S9 | Stripe-Zahlungen testen | ⬜ | Karte `4242…` ✓, `4000 0027 6000 3184` (3DS) ✓, `4000 0000 0000 9995` ✗ (abgelehnt); Rücksprung schließen/Tab zumachen → Webhook setzt trotzdem „bezahlt“; Erstattung im Stripe-Dashboard → Shop-Status „Erstattet“. `npm run check:stripe` |
| S10 | Apple Pay / Google Pay | ⬜ | Domain in Stripe registrieren + Verifizierungsdatei in `public/.well-known/`; Test auf iPhone/Safari bzw. Chrome mit Google Pay |
| S11 | PayPal Sandbox | ⬜ | Sandbox-App-Zugang; Kauf + Abbruch + Erstattung testen |
| S12 | E-Mail-Zustellung | ⬜ | Resend-Domain verifizieren (SPF/DKIM), Passwort-Reset, Bestellbestätigung, Versandmail real zustellen und im Spam-Ordner prüfen |
| S13 | Rate-Limiting verteilt | ⬜ | Upstash-Redis anlegen → `UPSTASH_REDIS_REST_*`; 25 falsche Logins → Sperre |
| S14 | E2E gegen Staging | ⬜ | `APP_ENV=staging E2E_ALLOW_REMOTE=1 E2E_BASE=https://staging… npm run e2e` (Datenbank-Zugang aus Staging-Env) |
| S15 | Cron | ⬜ | Vercel → Cron-Jobs: `expire-orders` läuft (Logs); unbezahlte Testbestellung nach 30 Min → storniert, Bestand zurück |
| S16 | Restore-Übung auf Staging | ⬜ | Dump von Staging in neue DB einspielen (Runbook `docs/BACKUP.md`) |
| S17 | Robots/Kennzeichnung | 🟡 | Code: `noindex`, `Disallow: /`, „Staging“-Badge. Im Browser gegenprüfen |
| S18 | Vercel-Zugriff auf Staging absichern | ⬜ | Deployment Protection (Vercel Auth/Passwort) für Preview-URLs aktivieren |
| S19 | Fachlicher Abnahme-Durchlauf | ⬜ | Produkt anlegen (mit Foto-Upload ≤ 4 MB) → kaufen → versenden → zustellen → bewerten → Vertrag anlegen + Dokument → Gutschein-Regeln |

---

## 3 · PRODUCTION (Live)

Werte aus `.env.production.example` in Vercel → Scope **Production**. Nichts aus LOCAL oder STAGING übernehmen.

### A · Infrastruktur

| # | Punkt | Status | Was du konfigurieren musst |
|---|---|---|---|
| P1 | **Eigene** Production-Datenbank `shop_production` | ⬜ | Neu anlegen, EU-Region, **nicht** `lumi_shop`, nicht Staging. TLS (`sslmode=require`), eigener App-Benutzer. Der Server startet sonst nicht (Wächter) |
| P2 | `DATABASE_URL` nur über Environment Variables | ✅ Code / ⬜ Eintrag | Repo enthält keine Zugangsdaten (Scan ✅). Du trägst die URLs in Vercel ein |
| P3 | Prisma-Migration Production | 🟡 | `migrate deploy` im Build vorbereitet; erster Lauf offen. Vorher Snapshot |
| P4 | Seed Production | 🟡 | `db:seed:base` + `db:seed:admin` mit `CONFIRM_PRODUCTION_SEED=yes` (Anleitung `docs/PRODUCTION.md` §3). **Kein** Demo-Seed (hart blockiert). Danach Admin-Passwort ändern, `ADMIN_PASSWORD` aus der Umgebung entfernen |
| P5 | Vercel Production-Deployment | ⬜ | Root `shop`, Env-Variablen, `CRON_SECRET`, Region `fra1` (in `vercel.json`) |
| P6 | Domain, DNS, HTTPS, `www`-Weiterleitung | ⬜ | Domain in Vercel, `NEXT_PUBLIC_APP_URL=https://www…`. HSTS ist gesetzt |
| P7 | Storage-Bucket Production | ⬜ | Eigener privater Bucket, Least-Privilege-Schlüssel, Versionierung/Replikation (`docs/BACKUP.md`), `S3_SSE=1` bei AWS |
| P8 | Backups | 🟡 | Script ✅ + Restore verifiziert. Offen: PITR im DB-Tarif aktivieren, täglicher Offsite-Dump (Workflow-Vorlage in `docs/BACKUP.md`), Bucket-Schutz, **Restore-Übung vor Livegang** |
| P9 | Rate-Limiting (Upstash) | ⬜ | Redis anlegen, `UPSTASH_REDIS_REST_*` (Warnung in Health/Dashboard, bis gesetzt) |
| P10 | Health-Monitoring | 🟡 | `/api/health` ✅. Offen: Uptime-Monitor (1 Min), Vercel-Alerts |
| P11 | Fehler-Tracking | ⬜ | Nicht integriert – z. B. Sentry ergänzen (optional, empfohlen) |

### B · Zahlungen & E-Mail

| # | Punkt | Status | Was du konfigurieren musst |
|---|---|---|---|
| P12 | Stripe-Live-Konto freigeschaltet | ⬜ | KYC, Auszahlungskonto, Statement-Descriptor, Zahlungsmethoden aktivieren |
| P13 | Stripe-**Live**-Schlüssel | ⬜ | `sk_live_`/`pk_live_` in Vercel. Der Wächter verbietet Testschlüssel in Production |
| P14 | Stripe-Live-Webhook | 🟡 | Endpoint + Events im Code ✅ (`payment_intent.succeeded/payment_failed`, `charge.refunded`). Live-Endpoint anlegen, `whsec_…` eintragen; `npm run check:stripe` |
| P15 | Apple Pay / Google Pay | ⬜ | Domain-Verifizierung (siehe S10) |
| P16 | PayPal Live | ⬜ | Live-App, `PAYPAL_ENV=live` |
| P17 | Vorkasse | ⬜ | IBAN/BIC/Kontoinhaber in *Admin → Einstellungen* (sonst nicht wählbar) |
| P18 | E-Mail-Absender | ⬜ | Resend + verifizierte Domain (SPF/DKIM/DMARC), `MAIL_FROM` ohne example.com (Pflicht, sonst Startabbruch) |
| P19 | **Live-Abnahmekauf** | ⬜ | Kleiner echter Betrag: bezahlt → Rechnung/Mail → Erstattung im Admin bzw. Stripe |

### C · Inhalte & Recht

| # | Punkt | Status | Was du tun musst |
|---|---|---|---|
| P20 | Anbieterdaten (Impressum, Rechnung, USt-IdNr.) | ⬜ | *Admin → Einstellungen*; Dashboard „Betriebsbereitschaft“ meldet Lücken |
| P21 | Rechtstexte prüfen lassen | ⬜ | AGB, Widerruf, Datenschutz, Versand, Zahlungsarten sind **Vorlagen** → Anwalt/Händlerbund/IT-Recht. Datenschutz um Auftragsverarbeiter (Vercel, Datenbank-, Storage-, Mail-, Redis-Anbieter, Stripe, PayPal) und Drittlandübermittlung ergänzen |
| P22 | AV-Verträge (Art. 28 DSGVO) | ⬜ | Mit Vercel, DB-Anbieter, Storage, Resend, Upstash abschließen; Verarbeitungsverzeichnis |
| P23 | Elektronische Widerrufsfunktion | ⬜ | Nach meinem Kenntnisstand verlangt die EU-Richtlinie 2023/2673 für Verträge im Fernabsatz ab 19.06.2026 eine leicht zugängliche Online-Widerrufsfunktion („Widerrufsbutton“). **Nicht umgesetzt** (nur Muster-Formular). Bitte rechtlich prüfen und ggf. ergänzen lassen |
| P24 | Barrierefreiheit (BFSG) | ⬜ | Prüfen, ob dein Shop unter das Barrierefreiheitsstärkungsgesetz fällt (Kleinstunternehmen-Ausnahme); ggf. Erklärung ergänzen und Audit (Tastatur, Kontraste, Screenreader) |
| P25 | Echte Produkte und Fotos | ⬜ | Produkte, Preise, Bestände, Größentabellen im Admin anlegen; **keine Platzhalter-Illustrationen** verwenden |
| P26 | Startseiten-Bilder ersetzen | ⬜ | Hero, Kategorie-Stories, Editorial, Kampagne liegen als Platzhalter unter `public/seed/e/…` → durch echte Kampagnenbilder ersetzen (gleiche Dateinamen oder Code anpassen) |
| P27 | Demo-Daten sind nicht vorhanden | ✅ Code / ⬜ Prüfung | Demo-Seed in Production blockiert; Dashboard/Health melden Demo-Daten als Fehler |
| P28 | Steuer-Einstellungen | ⬜ | MwSt.-Satz (19 %), Versandkosten, Freigrenze im Admin prüfen; Kleinunternehmer-Regelung wird **nicht** unterstützt (Steuerberater) |

### D · Sicherheit & Betrieb

| # | Punkt | Status | Was du tun musst |
|---|---|---|---|
| P29 | Starker Admin, kein Dev-Zugang | 🟡 | Seed lehnt schwache Passwörter ab; Readiness meldet `@lumi.local`-Admins als Fehler. Passwort nach Erstlogin ändern |
| P30 | Admin-2FA | ⬜ | **Nicht implementiert.** Bis dahin: Passwortmanager, Vercel-/Stripe-/DB-Konten mit 2FA, wenige Admins |
| P31 | Vercel-/Provider-Konten absichern | ⬜ | 2FA für Vercel, GitHub, DB-Anbieter, Stripe, Resend; Rollen minimal |
| P32 | Security-Header/CSP | ✅ | gesetzt; Einschränkung: `unsafe-inline` für Skripte (siehe `docs/PRODUCTION.md` §9) |
| P33 | Suchmaschinen | ✅ | Nur Production ist indexierbar; Sitemap/robots aktiv. Nach Livegang Search Console einreichen |
| P34 | Wartungs-/Incident-Runbook | 🟡 | Rollback + Restore beschrieben; Verantwortliche und Erreichbarkeit festlegen |
| P35 | Go-Live-Freigabe | ⬜ | Dashboard „Betriebsbereitschaft“ ohne ✖, `/api/health?detail=1` sauber, Abnahmekauf ✅, Restore-Übung ✅ |
