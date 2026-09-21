# Produktivbetrieb – Leitfaden

## Zielarchitektur

```
Kunde ─► Vercel (Next.js, Region fra1) ─┬─► PostgreSQL (eigene Production-DB, EU, PITR)      via DATABASE_URL (gepoolt)
                                        ├─► S3-Bucket (privat): Rechnungen, Vertragsdokumente, Produktbilder
                                        ├─► Stripe / PayPal (Zahlung; Webhooks → /api/webhooks/stripe)
                                        ├─► Resend (E-Mail)      └─► Upstash Redis (Rate-Limiting)
Vercel Cron (täglich; Pro: 10 min) ─► /api/cron/expire-orders     Uptime-Monitor ─► /api/health
```

Die **lokale Datenbank `lumi_shop` wird nie produktiv verwendet.** Production bekommt eine eigene, neu angelegte Datenbank; es werden **keine lokalen Daten übernommen** (Kategorien/Einstellungen über den Basis-Seed, Produkte legst du im Admin an).

## 1 · PostgreSQL für Production

Empfohlen: **Neon** (Region Frankfurt `eu-central-1`) oder Supabase/AWS RDS in der EU.
1. Zwei getrennte Projekte/Datenbanken anlegen: `shop_staging` und `shop_production`.
2. Pro Datenbank zwei Verbindungs-URLs kopieren: **gepoolt** (Host enthält bei Neon `-pooler`) → `DATABASE_URL` (mit `?sslmode=require&pgbouncer=true&connect_timeout=15`), **direkt** → `DIRECT_URL` (`?sslmode=require`).
3. PITR/Backups aktivieren (siehe `docs/BACKUP.md`), IP-Beschränkung nur, falls der Anbieter feste Vercel-IPs unterstützt (sonst weglassen; TLS + starkes Passwort).
4. Eigener DB-Benutzer für die App (nicht der Owner-/Superuser), Migrationsbenutzer = Owner.

## 2 · Prisma Production-Migration

- Schema-Änderungen **nur lokal** entwickeln: `npm run db:migrate -- --name beschreibung` → Migration unter `prisma/migrations/` **committen**.
- Deployment führt automatisch `prisma migrate deploy` aus (`scripts/vercel-build.mjs`, über `DIRECT_URL`) – vor `next build`. Nur Vorwärts-Migrationen; **nie** `migrate reset`, `db push` oder manuelle DDL in Production (`db:reset:local` verweigert alles außer `APP_ENV=local`).
- Reihenfolge: PR → CI (Migration gegen flüchtige DB + E2E) → Merge → Preview/Staging migriert Staging-DB → Production-Deploy migriert Production-DB.
- Rückwärtskompatibel migrieren („expand → deploy → contract“): erst Spalte hinzufügen, Code deployen, später alte Spalte entfernen. Zerstörerische Änderungen (Drop/Rename) in zwei Releases.
- Status prüfen: `DIRECT_URL=… npm run db:status`. Schlägt eine Migration fehl: Ursache beheben, dann `npx prisma migrate resolve --rolled-back <name>` bzw. `--applied <name>` – erst nach Backup/PITR-Marke.
- Vor jeder riskanten Migration: manueller Snapshot/Branch der Production-DB.

## 3 · Seed-System (Test- klar von Produktionsdaten getrennt)

| Befehl | Was | Wo erlaubt |
|---|---|---|
| `npm run db:seed:base` | 4 Kategorien + leere Einstellungen. **Keine** Produkte/Marken/Gutscheine/Kunden | local, staging, production¹ |
| `npm run db:seed:admin` | ersten Administrator anlegen (überschreibt nie; schwache Passwörter werden abgelehnt) | local, staging, production¹ |
| `npm run db:seed:demo` | fiktiver Demo-Katalog + Test-Gutscheine (`WELCOME10`, `SOMMER20`) | local; staging nur mit `ALLOW_DEMO_SEED=1`; **production: hart verboten** |
| `npm run db:seed` | base + demo + admin | nur `APP_ENV=local` |
| `npm run db:purge-demo` | entfernt Demo-Daten (nur wenn keine Bestellung darauf verweist) | local, staging (`CONFIRM_PURGE=yes`) |

¹ gegen Production nur mit `CONFIRM_PRODUCTION_SEED=yes` und validierter Remote-Datenbank. Jeder Seed gibt vorher **Host/DB-Name** aus (ohne Zugangsdaten). Demo-Daten sind über den Einstellungs-Eintrag `demo_seed` erkennbar – der Readiness-Check im Admin-Dashboard und `/api/health?detail=1` melden sie in Production als Fehler.

**Erstes Setup Production (aus deiner Shell, Werte nur für diesen Aufruf):**
```bash
export DATABASE_URL='<Production, gepoolt>' DIRECT_URL='<Production, direkt>' APP_ENV=production CONFIRM_PRODUCTION_SEED=yes
npx prisma migrate deploy            # falls der erste Deploy noch nicht lief
npm run db:seed:base
ADMIN_EMAIL='chef@deine-domain.de' ADMIN_PASSWORD='<≥14 Zeichen>' npm run db:seed:admin
unset DATABASE_URL DIRECT_URL ADMIN_PASSWORD
```
Danach einloggen (`/login`), **Passwort ändern**, Anbieterdaten unter *Admin → Einstellungen* pflegen, Marken/Produkte anlegen. Achtung: Ein lokales `.env` im Ordner darf die Shell-Variablen nicht überschreiben – Shell-Variablen haben Vorrang, `APP_ENV`/Host werden vor dem Schreiben geprüft und ausgegeben.

## 4 · Vercel

0. **Branch-Modell:** `main` = Production (Build wird übersprungen, bis `ALLOW_PRODUCTION_DEPLOY=1` gesetzt ist), `staging` = Preview/Staging (siehe `docs/VERCEL-QUICKSTART.md`).
1. Repository verbinden. **Root Directory: leer lassen** (die App liegt im Repo-Root). Framework: Next.js. Node 22.
2. `vercel.json` setzt Build-Kommando, Region `fra1` und einen **täglichen** Cron (`0 3 * * *`, Hobby-kompatibel) für `/api/cron/expire-orders` (gibt Bestandsreservierungen unbezahlter Bestellungen frei; zusätzlich läuft die Freigabe bei jeder neuen Bestellung). **Für den Live-Betrieb auf Vercel Pro** den Zeitplan in `vercel.json` auf `*/10 * * * *` stellen – Hobby erlaubt nur tägliche Crons und **keine kommerzielle Nutzung**.
3. Environment Variables je Scope eintragen: **Production** ← `.env.production.example`, **Preview** ← `.env.staging.example`. Preview *muss* eigene `DATABASE_URL`/`DIRECT_URL` haben (sonst bricht der Build ab – gewollt).
4. `CRON_SECRET` setzen → Vercel sendet ihn automatisch an den Cron.
5. Domain hinzufügen, DNS setzen, `www` ↔ Apex-Weiterleitung, HTTPS ist automatisch. `NEXT_PUBLIC_APP_URL` = kanonische URL.
6. **Upload-Limit:** Vercel begrenzt Request-Bodies auf 4,5 MB → Produkt-/Dokument-Uploads sind auf **4 MB** begrenzt (Bilder vorher komprimieren).
7. Nach dem Deploy: `/api/health` → `{"status":"ok"}`; `/api/health?detail=1` mit `Authorization: Bearer <CRON_SECRET>` zeigt Version und Betriebsbereitschaft.

## 5 · Stripe

**Live-Konto vorbereiten:** Geschäftsdaten/Identitätsprüfung (KYC) abschließen, Auszahlungskonto hinterlegen, Kontoname/Statement-Descriptor setzen, Zahlungsmethoden aktivieren (Karten, Apple Pay, Google Pay, optional PayPal, SEPA …).
1. **Schlüssel** (Dashboard → Entwickler → API-Schlüssel, Modus *Live*): `sk_live_…` → `STRIPE_SECRET_KEY`, `pk_live_…` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Optional Restricted Key mit den Rechten *PaymentIntents (schreiben), Refunds (schreiben), Webhook-Endpoints/Accounts/Payment-Method-Configs (lesen)*.
2. **Webhook** (Entwickler → Webhooks → Endpoint hinzufügen, Modus *Live*): URL `https://www.deine-domain.de/api/webhooks/stripe`; Events: **`payment_intent.succeeded`**, **`payment_intent.payment_failed`**, **`charge.refunded`**. Signing-Secret `whsec_…` → `STRIPE_WEBHOOK_SECRET`. Der Endpoint prüft die Signatur, gleicht Betrag/Währung ab und ist idempotent; bei Fehlern antwortet er 500 (Stripe wiederholt automatisch).
3. **Apple Pay:** Dashboard → Einstellungen → Zahlungsmethoden → Apple Pay → Domain hinzufügen; die heruntergeladene Datei nach `public/.well-known/apple-developer-merchantid-domain-association` legen (ohne Endung), deployen, „Verifizieren“. Google Pay erscheint automatisch (Payment Element).
4. **Prüfen:** `STRIPE_SECRET_KEY=sk_live_… NEXT_PUBLIC_APP_URL=https://www.deine-domain.de npm run check:stripe` → prüft Modus, Konto-Freischaltung, Webhook-Endpoint + Events, Zahlarten.
5. **Test in Staging** mit Testschlüsseln und eigenem Test-Webhook: Karte `4242 4242 4242 4242` (Erfolg), `4000 0027 6000 3184` (3-D-Secure), `4000 0000 0000 9995` (abgelehnt). Lokal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
6. **Live-Abnahme:** echte Bestellung mit kleinem Betrag → Order „bezahlt“, Rechnung, Bestätigungsmail → im Shop-Admin *Erstatten* (löst Stripe-Refund aus). Erstattungen im Stripe-Dashboard werden per `charge.refunded` automatisch in den Shop übernommen (Status „Erstattet“, Bestand zurück; Teilerstattungen nur im Audit-Log vermerkt).

Sicherheitsdesign: Kartendaten gelangen nie auf unseren Server; Beträge/Preise werden serverseitig aus dem Warenkorb berechnet; Erfolg wird per Webhook **und** serverseitiger PaymentIntent-Abfrage bestätigt.

## 6 · Auth/Session in Production
- Sessions: zufälliges Token, in der DB nur als SHA-256; Cookie `__Host-lumi_session` (HttpOnly, Secure, SameSite=Lax, Path=/, keine Domain). Kunden 30 Tage, **Admins 12 Stunden**.
- Passwort-Hashing scrypt (N=16384), Passwort ≥ 10 Zeichen; Passwortwechsel/-Reset beendet alle anderen Sitzungen.
- Login-/Registrierungs-/Reset-Rate-Limits (Upstash), keine Konten-Enumeration beim Reset, Timing-Angleich beim Login.
- CSRF: SameSite + Origin-Prüfung für alle mutierenden Route-Handler; Server Actions prüft Next.js.
- Admin-Autorisierung serverseitig in Layout **und** jeder Action/API; Nicht-Admins sehen 404.
- Noch nicht umgesetzt: **Zwei-Faktor-Authentifizierung** für Admins (dringend empfohlen, siehe Checkliste).

## 7 · Health Check & Monitoring
- **Konfigurations-Wächter:** `src/middleware.ts` prüft in staging/production die Umgebung bei jeder Anfrage (Ergebnis pro Instanz gecacht). Fehlerhaft → 503 statt Absturz; Details im Server-Log (`[config:…] FEHLER`), in staging zusätzlich auf der Seite.
- **Neon/Pooler:** `DATABASE_URL` (auch `POSTGRES_PRISMA_URL`/`POSTGRES_URL` als Fallback) wird für Prisma aufbereitet: bei Pooler-Host wird `pgbouncer=true` und `connect_timeout=15` ergänzt (`resolveDatabaseUrl` in `src/lib/config.ts`). Migrationen nutzen `DIRECT_URL` bzw. `DATABASE_URL_UNPOOLED`.
- `GET /api/health` (öffentlich, minimal): `status` `ok|degraded|down`, Checks `database`, `schema`, `migrations`, `storage` (nur true/false). HTTP **503** bei Datenbank-/Schema-/Migrationsproblem, 200 + `degraded` bei Storage-Problem. Rate-limitiert, `no-store`.
- `GET /api/health?detail=1` mit Bearer-`CRON_SECRET`: Latenzen, Version (Commit), Region, Betriebsbereitschaft (fehlende Anbieterdaten, Demo-Daten, Admin-Status, Zahlarten). Enthält nie Secrets.
- Uptime-Monitor (UptimeRobot/Better Stack/Checkly) auf `https://www.deine-domain.de/api/health`, Alarm bei ≠ 200, Intervall 1 Min; zusätzlich Vercel-Alerts und Stripe-Webhook-Fehler-E-Mails aktivieren.
- Logs: Vercel Logs (Fehler tragen die Präfixe `[api]`, `[stripe webhook]`, `[rate-limit]`, `[invoice]`). Fehler-Tracking (z. B. Sentry) ist **nicht** integriert.

## 8 · Release- und Rollback-Prozess
1. PR → CI (Secret-Scan, Typecheck, Unit-Tests, Migration + Build + E2E gegen flüchtige DB).
2. Preview/Staging prüfen (Checkliste STAGING).
3. Merge nach `main` → Production-Deploy (Migration automatisch).
4. Smoke-Test: `/api/health`, Testkauf (optional Testartikel mit Sperrkennzeichen), Admin-Dashboard *Betriebsbereitschaft* ohne Fehler.
5. **Rollback Code:** Vercel → Deployments → *Instant Rollback*. **Rollback Daten:** PITR-Zeitpunkt vor der Migration (deshalb expand/contract).

## 9 · Bekannte Grenzen (Stand)
- CSP erlaubt `script-src 'unsafe-inline'` (Next-Inline-Skripte); Nonce-basierte CSP wäre ein späterer Ausbau.
- Keine Admin-2FA, kein integriertes Fehler-Tracking, keine automatisierten Browser-E2E-Tests (E2E läuft per HTTP-API).
- Newsletter speichert Adressen ohne Double-Opt-in und ohne Versandanbindung (Export aus Tabelle `NewsletterSubscriber`); für Marketing-Versand Double-Opt-in ergänzen.
- Versand nur DE/AT; eine Mehrwertsteuersatz-Konfiguration (Standard 19 %).
- Bild-Optimierung (`sharp`): Version 0.35.4. `npm audit` meldet noch Hinweise in Build-Werkzeugen (PostCSS in Next, Prisma-CLI) – kein Laufzeit-Angriffsvektor mit eigenen Eingaben; Next 16-Update später einplanen.
