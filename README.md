# LUMI – Premium Online-Shop

Echter E-Commerce-Shop (kein Mockup): Next.js 15 · React 19 · TypeScript · Tailwind · Framer Motion · PostgreSQL · Prisma · Stripe · PayPal.
Kategorien: **Junge · Mädchen · Schuhe · Dies & Das**. Der gesamte Kaufprozess läuft gegen die Datenbank:
Produkt → Variante/Größe → Warenkorb → Checkout → Zahlung → Bestellung → Bestätigung → Kundenkonto → Admin.

## Schnellstart (lokal)

```bash
cp .env.example .env            # lokale Werte eintragen (.env wird nie eingecheckt)
createdb lumi_shop              # lokale Entwicklungsdatenbank
npm install
npx prisma migrate deploy       # Schema anlegen
npm run db:seed                 # NUR lokal: Kategorien + Demo-Katalog + Dev-Admin
npm run dev                     # http://localhost:3000
```

Lokaler Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` aus `.env`. Demo-Gutscheine: `WELCOME10` (10 %, ab 30 €, einmal pro Kunde), `SOMMER20`.

| Befehl | Zweck |
|---|---|
| `npm run dev` / `npm run build && npm start` | Entwicklung / Produktionsmodus |
| `npm run typecheck` · `npm test` | TypeScript · Unit-Tests (Preise, Gutscheine, Konfigurationsregeln) |
| `npm run e2e` | End-to-End gegen laufenden **Dev**-Server (`npm run dev -- -p 3100`), 91 Prüfungen. Verweigert production |
| `npm run db:migrate -- --name x` | neue Migration entwickeln (lokal) |
| `npm run db:deploy` · `db:status` | Migrationen anwenden / Status (Production: nur `deploy`) |
| `npm run db:seed:base` · `db:seed:admin` · `db:seed:demo` | Seeds einzeln (siehe `docs/PRODUCTION.md` §3) |
| `npm run db:reset:local` · `db:purge-demo` | lokal zurücksetzen / Demo-Daten entfernen (mit Schutzschaltern) |
| `npm run check:secrets` · `check:config` · `check:stripe` | Secret-Scan · Umgebungsprüfung · Stripe-Prüfung |
| `npm run images` | Seed-Bilder neu erzeugen (Platzhalter) |

## Produktion

**Die lokale Datenbank wird nie produktiv genutzt.** Production/Staging bekommen eigene Datenbanken, eigenen Storage und eigene Schlüssel; `APP_ENV` trennt die Umgebungen, und ein Konfigurations-Wächter verhindert den Start bei Fehlkonfiguration.

| Dokument | Inhalt |
|---|---|
| [`docs/GO-LIVE-CHECKLIST.md`](docs/GO-LIVE-CHECKLIST.md) | **Checkliste LOCAL / STAGING / PRODUCTION** – erledigt / offen / was du konfigurieren musst |
| [`docs/PRODUCTION.md`](docs/PRODUCTION.md) | Datenbank, Prisma-Migrationen, Seeds, Vercel, Stripe & Webhooks, Auth, Health Check, Release/Rollback |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | alle Umgebungsvariablen je Umgebung |
| [`docs/BACKUP.md`](docs/BACKUP.md) | Backup-Strategie, Restore-Runbook |
| `.env.example`, `.env.staging.example`, `.env.production.example` | Vorlagen (nur Platzhalter) |

## Architektur

- **Server Components** für Katalog/Produkt/Startseite (ISR, `revalidate = 60`; Cache wird bei Bestand-/Produktänderungen invalidiert). Nutzerspezifisches (Warenkorb, Wunschliste, Login-Status) lädt der Client über `/api/session`, damit Seiten cachebar bleiben.
- **Route Handlers** (`/api/*`) für Warenkorb, Wunschliste, Suche, Checkout, Webhooks; **Server Actions** für Auth, Konto und Admin.
- **Preise, Rabatte, Versand, Summen, Bestand** werden ausschließlich serverseitig berechnet (`src/lib/orders.ts`). Der Client wählt nur Adresse, Versand- und Zahlart.
- **Bestand**: atomare Reservierung beim Anlegen der Bestellung (`UPDATE … WHERE quantity >= n`), Freigabe bei Storno/Ablauf (`/api/cron/expire-orders`, Minuten-Cron empfohlen), Rückbuchung bei Erstattung.
- **Zahlungen**: Stripe Payment Element (Karte, Apple Pay, Google Pay, weitere – im Stripe-Dashboard aktivieren), PayPal Orders v2 (Redirect + serverseitiges Capture), Vorkasse. Erfolg wird **serverseitig** verifiziert (Webhook + Verify-Endpoint, idempotent, Betragsprüfung). Es werden keine Zahlungsdaten gespeichert.
- **Storage**: `src/lib/storage.ts` – lokal Verzeichnis, in Production **S3-kompatibler privater Bucket** (`STORAGE_DRIVER=s3`; Pflicht auf Vercel). Öffentliche Produktbilder über `/media/…`, private Dateien (Rechnungen, Vertragsdokumente) nur über `/api/files/:id` mit Autorisierung. Uploads per Magic Bytes geprüft, max. 4 MB (Vercel-Body-Limit).
- **Rechnungen**: PDF (pdf-lib) automatisch nach Zahlungseingang, fortlaufende Nummer.
- **Verträge**: eigener Bereich („Deine Verträge“), getrennt vom Shop-Prozess; Admin legt Verträge an und lädt Dokumente hoch.

## Scroll-/Motion-System (`src/components/motion`, `src/components/home`)

Scrollposition → Fortschritt 0…1 → Animation (läuft beim Zurückscrollen exakt rückwärts): Hero-Scroll-Story, Sticky-Editorial („Neu entdeckt → Für jeden Tag → Dein neuer Favorit → Jetzt entdecken“), horizontaler Produkt-Scroll, Kategorie-Stories mit Clip-Path/Blur→scharf/Parallax, Header-Zustände (transparent → Glass → kompakt), `data-reveal`-Typen (`fade up blur clip mask scale slide`) über *einen* IntersectionObserver.
Nur `transform / opacity / filter / clip-path`; Framer-Motion-`useScroll` (kein Re-Render pro Frame), Messwerte werden gecacht (ResizeObserver). `prefers-reduced-motion`: keine Sticky-Bühnen, kein Parallax, alle Inhalte sichtbar.

## Sicherheit

scrypt-Passwort-Hashing · serverseitige Sessions (Token nur als SHA-256 in der DB, HttpOnly + SameSite=Lax + Secure in Prod) · Admin-Autorisierung in Layout **und** jeder Action/API (Nicht-Admins → 404) · Zod-Validierung · Rate-Limiting (Login, Registrierung, Reset, Checkout, Suche …) · CSRF: SameSite + Origin-Prüfung für alle mutierenden Route Handler (Server Actions prüft Next selbst) · CSP & Security-Header · Audit-Log · keine Account-Enumeration beim Passwort-Reset · Gast-Bestellungen nur mit unratbarem Token.
Rate-Limiting: verteilt über Upstash Redis (`UPSTASH_REDIS_REST_*`), ohne Konfiguration nur pro Instanz (lokal ok, in Production Warnung).

## Zahlungen

Stripe (Payment Element: Karte, Apple Pay, Google Pay, weitere), PayPal Orders v2, Vorkasse. Einrichtung Schritt für Schritt, Webhook-Events und Live-Abnahme: `docs/PRODUCTION.md` §5. Die **Testzahlung** existiert nur bei `APP_ENV=local` ohne Stripe-Key.

## Vor dem Livegang

Alles Offene mit Status steht in [`docs/GO-LIVE-CHECKLIST.md`](docs/GO-LIVE-CHECKLIST.md). Kernpunkte: eigene Production-DB, Storage-Bucket, Stripe-Live + Webhook, Resend-Domain, Anbieterdaten und **juristisch geprüfte** Rechtstexte, echte Produkte/Fotos (die mitgelieferten Bilder sind generierte Platzhalter, auch die Startseitenbilder unter `public/seed/e/`).
