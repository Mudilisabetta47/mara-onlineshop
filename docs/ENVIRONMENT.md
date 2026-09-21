# Umgebungsvariablen

Drei strikt getrennte Umgebungen – gesteuert über **`APP_ENV`** (`local` | `staging` | `production`).
Auf Vercel wird sie automatisch abgeleitet (Scope *Production* → `production`, *Preview* → `staging`), kann aber explizit gesetzt werden (empfohlen).

**Regeln**
- Secrets stehen **ausschließlich** in den Environment Variables der Hosting-Plattform (bzw. lokal in `.env`). Nie im Repository. `npm run check:secrets` prüft das (läuft auch in der CI).
- `.env`, `.env.*` sind per `.gitignore` ausgeschlossen; eingecheckt sind nur `.env.example`, `.env.staging.example`, `.env.production.example` (Platzhalter).
- Jede Umgebung hat **eigene** Datenbank, eigenen Storage-Bucket, eigene Stripe-/PayPal-Schlüssel. Beim Serverstart wird die Konfiguration geprüft (`src/lib/config.ts`); in staging/production antwortet der Shop mit **503 „Konfigurationsfehler“** (Middleware `src/middleware.ts`; in staging mit Liste der Variablen-Namen, in production nur mit Hinweis auf das Server-Log), wenn z. B. die Datenbank lokal ist, Stripe-Testschlüssel in Production stehen oder der Storage nicht `s3` ist. Manuell prüfen: `npm run check:config`.

| Variable | local | staging | production | Beschreibung |
|---|---|---|---|---|
| `APP_ENV` | `local` | `staging` | `production` | Umgebung (steuert Schutzschalter, Robots, Testzahlung, Seeds) |
| `DATABASE_URL` | lokale DB | Staging-DB, **gepoolt**, `sslmode=require` | Production-DB, **gepoolt**, `sslmode=require` | Laufzeit-Verbindung. Lokale Hosts und der Name `lumi_shop` sind in staging/production verboten |
| `DIRECT_URL` | = `DATABASE_URL` | Staging-DB **direkt** | Production-DB **direkt** | Nur für `prisma migrate deploy` (nicht gepoolt) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://staging.…` | `https://www.…` | Öffentliche Basis-URL (E-Mail-Links, PayPal-Rückkehr, Canonical). Pflicht: https |
| `NEXT_PUBLIC_SHOP_NAME` | Lilli und Lou | Lilli und Lou | Lilli und Lou | Anzeigename |
| `CRON_SECRET` | beliebig | ≥ 24 Zeichen | ≥ 24 Zeichen | Schützt `/api/cron/*` und `/api/health?detail=1`. Vercel sendet ihn Crons automatisch als `Authorization: Bearer …` |
| `STORAGE_DRIVER` | `local` | `s3` | **`s3` (Pflicht)** | Vercel-Dateisystem ist flüchtig → Rechnungen/Uploads gingen verloren |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | – | Staging-Bucket | Production-Bucket | S3-kompatibel (R2, S3, Hetzner …). Bucket **privat** |
| `S3_ENDPOINT`, `S3_REGION`, `S3_FORCE_PATH_STYLE`, `S3_PREFIX`, `S3_SSE` | – | optional | optional | Endpoint (R2/Hetzner), Region (`auto` bei R2), Path-Style, Key-Präfix, `S3_SSE=1` = AES-256 serverseitig |
| `STORAGE_DIR` | `./storage` | – | – | Nur `STORAGE_DRIVER=local` |
| `STRIPE_SECRET_KEY` | optional `sk_test_` | `sk_test_…` | **`sk_live_…`** | Testschlüssel in production bzw. Live-Schlüssel in staging → 503 Konfigurationsfehler |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional | `pk_test_…` | **`pk_live_…`** | Öffentlicher Schlüssel (darf im Browser stehen) |
| `STRIPE_WEBHOOK_SECRET` | optional (`stripe listen`) | `whsec_…` (Staging-Endpoint) | `whsec_…` (Live-Endpoint) | Pflicht, sobald Stripe aktiv ist |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | optional | Sandbox | Live | |
| `PAYPAL_ENV` | `sandbox` | `sandbox` | **`live`** | |
| `RESEND_API_KEY` | leer (Mails → Konsole) | Key | **Pflicht** | Passwort-Reset & Bestellmails |
| `MAIL_FROM` | egal | verifizierte Domain | **verifizierte Domain, keine example.com** | z. B. `Shop <bestellung@deine-domain.de>` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | leer | empfohlen | **dringend empfohlen** | Verteiltes Rate-Limiting (ohne: nur pro Serverinstanz) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Dev-Werte | nur für Seed | nur für Seed, **danach entfernen** | Admin-Bootstrap (`db:seed:admin`); in staging/production ≥ 14 Zeichen |
| `CONFIRM_PRODUCTION_SEED` | – | – | `yes` (nur beim Seed) | Bewusste Bestätigung für Seeds gegen Production |
| `ALLOW_DEMO_SEED` | – | `1` (nur beim Seed) | **verboten** | Demo-Daten nur in staging bewusst erlauben |
| `E2E_ALLOW_REMOTE` | – | `1` (nur beim E2E) | **verboten** | E2E gegen Remote-Staging-DB |
| `SKIP_MIGRATIONS` | – | optional | optional | `1` = Build führt keine Migration aus (falls die CI migriert) |

## Was pro Umgebung passiert

| Verhalten | local | staging | production |
|---|---|---|---|
| Testzahlung („Testzahlung“ im Checkout) | ✅ (ohne Stripe-Key) | ❌ | ❌ |
| Vorkasse wählbar | ✅ | nur mit IBAN im Admin | nur mit IBAN im Admin |
| Demo-Seed | ✅ | nur mit `ALLOW_DEMO_SEED=1` | ❌ verboten |
| Suchmaschinen | `noindex` | `noindex` + `Disallow: /` | indexierbar, Sitemap aktiv |
| Sichtbarer Umgebungs-Badge | „Local“ | „Staging · Testumgebung“ | keiner |
| Cookies | `lumi_*` | `__Host-lumi_*` | `__Host-lumi_*` |
| Admin-Session | 12 h | 12 h | 12 h (Kunden: 30 Tage) |
