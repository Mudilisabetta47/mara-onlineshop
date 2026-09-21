# Vercel-Schnellstart (erster Testlauf in ~15 Minuten)

Ziel: Den Shop **online öffnen und ausprobieren** (Testumgebung mit Demo-Katalog). Für den echten Live-Betrieb danach `docs/GO-LIVE-CHECKLIST.md` abarbeiten.

Was Vercel **braucht**, damit überhaupt etwas geöffnet werden kann: eine **erreichbare PostgreSQL-Datenbank** und ein paar **Environment Variables**. Ohne beides bricht der Build mit einer klaren Meldung ab (siehe „Fehlerbilder“).

## 1 · Datenbank anlegen (kostenlos, ~3 Min.)
1. Bei **neon.tech** registrieren → *New Project* → Region **Frankfurt (eu-central-1)**, Name z. B. `mara-shop`.
2. *Connection Details*: Zwei Strings kopieren
   - **Pooled connection** (Host enthält `-pooler`) → das wird `DATABASE_URL`; am Ende `&pgbouncer=true&connect_timeout=15` anhängen.
   - **Direct connection** (Schalter „Pooled connection“ ausschalten) → das wird `DIRECT_URL`.
   Beide enthalten `?sslmode=require`.

## 2 · Datenbank einmalig füllen (auf deinem Rechner, im Projektordner)
```bash
npm install
export APP_ENV=staging ALLOW_DEMO_SEED=1
export DATABASE_URL='<pooled-URL>'  DIRECT_URL='<direct-URL>'
export ADMIN_EMAIL='deine@mail.de'  ADMIN_PASSWORD='<mind. 14 Zeichen, Groß/Klein/Ziffer>'
npx prisma migrate deploy      # Tabellen anlegen
npm run db:seed:demo           # Kategorien + Demo-Produkte
npm run db:seed:admin          # dein Admin-Zugang
unset DATABASE_URL DIRECT_URL ADMIN_PASSWORD
```
(Ein lokales `.env` stört nicht: Variablen aus der Shell haben Vorrang. Der Seed zeigt vorher Host/DB-Name zur Kontrolle.)

## 3 · Vercel-Projekt
1. vercel.com → *Add New → Project* → Repository `mara-onlineshop` importieren. **Root Directory: leer lassen** (die App liegt im Repo-Root). Framework wird als Next.js erkannt.
2. *Environment Variables* (Scope **Production**) eintragen:

| Name | Wert |
|---|---|
| `APP_ENV` | `staging` *(Testlauf – siehe Hinweis)* |
| `DATABASE_URL` | gepoolte URL aus Schritt 1 |
| `DIRECT_URL` | direkte URL aus Schritt 1 |
| `NEXT_PUBLIC_APP_URL` | `https://<dein-projektname>.vercel.app` (nach dem ersten Deploy korrekt setzen und neu deployen) |
| `CRON_SECRET` | zufällig, z. B. Ausgabe von `openssl rand -hex 32` |

   Für **Bezahlen** im Checkout zusätzlich (Stripe **Test**modus): `STRIPE_SECRET_KEY` (`sk_test_…`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`), `STRIPE_WEBHOOK_SECRET` (`whsec_…`, Webhook auf `https://<domain>/api/webhooks/stripe`). Alternativ nach dem Login unter *Admin → Einstellungen* eine IBAN eintragen → „Vorkasse“ ist wählbar.
3. *Deploy*. Der Build führt selbst `prisma migrate deploy` aus.
4. Öffnen: `https://<projekt>.vercel.app` (Shop), `/api/health` (muss `"status":"ok"` zeigen), `/login` (Admin).

**Hinweis Testlauf:** `APP_ENV=staging` zeigt einen „Staging“-Badge, sperrt Suchmaschinen und erlaubt Testschlüssel. Ohne S3-Bucket funktionieren Bild-Uploads und Rechnungs-PDFs **nicht** (nur Warnung in staging). Für echte Kunden: `APP_ENV=production` mit den Werten aus `.env.production.example` – siehe Checkliste.

## Fehlerbilder
| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| Build: „Fehlt in der Vercel-Umgebung: DATABASE_URL / DIRECT_URL“ | Variablen fehlen oder falscher Scope (Änderungen wirken erst nach **Redeploy**) | Beide im Scope **Production** (bzw. Preview) setzen. Bei der Vercel-Neon-Integration reicht `DATABASE_URL`; `DATABASE_URL_UNPOOLED` wird automatisch als `DIRECT_URL` verwendet |
| Build: `P1001` / `P1000` mit Neon | `&channel_binding=require` in der URL | diesen Teil aus beiden URLs löschen, `sslmode=require` behalten |
| Build: „DIRECT_URL zeigt auf eine lokale Datenbank“ | `localhost`-URL eingetragen | Neon-URL verwenden |
| Build: `P1001 Can't reach database` | Direct-URL falsch / Neon-Projekt pausiert | URL prüfen, Neon-Dashboard öffnen (weckt die DB) |
| Seite zeigt **„Der Shop ist nicht korrekt konfiguriert“** bzw. HTTP **503** `Konfigurationsfehler` | Konfigurations-Wächter: In *staging* steht die Liste der betroffenen Variablen direkt auf der Seite (nur Namen, keine Werte); in *production* zeigt Vercel → *Logs* `[config:…] FEHLER …` | Genannte Variable korrigieren, neu deployen |
| `/api/health` → 503 `"status":"down"` | Datenbank/Schema/Migrationen nicht erreichbar oder nicht angewendet | Ursache im Detail: `curl -H "Authorization: Bearer <CRON_SECRET>" "https://<domain>/api/health?detail=1"` (Fehlertext ohne Passwort) |
| HTTP **500** ohne Text auf allen dynamischen Seiten | Server-Funktion stürzt beim Start ab (Ursache im Vercel-Log: *Logs → Errors*) | Fehlermeldung aus dem Log an den Support/Entwickler geben |
| Shop leer (keine Produkte) | Seed nicht ausgeführt | Schritt 2 wiederholen |
| Checkout: „keine Zahlungsart“ | Weder Stripe noch IBAN konfiguriert | Stripe-Testschlüssel setzen oder IBAN im Admin |
| Deploy abgelehnt: „Hobby accounts are limited to daily cron jobs“ | Cron zu häufig | `vercel.json` steht auf täglich – aktuellen Stand aus GitHub verwenden |
