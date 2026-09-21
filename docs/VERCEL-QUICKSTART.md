# Vercel-Schnellstart: Staging (Preview) mit Neon

Ziel: Den Shop **online ausprobieren**, ohne ein echtes Production-Deployment.

## Das Branch-Modell

| Git-Branch | Vercel-Umgebung (Scope) | `APP_ENV` | Zweck | Wird gebaut? |
|---|---|---|---|---|
| **`staging`** | **Preview** | `staging` | Test-/Abnahme-Umgebung mit Neon-Testdatenbank, Stripe-**Test**schlüsseln | ja, bei jedem Push |
| **`main`** | **Production** | `production` | später der Live-Shop | **nein** – wird übersprungen, bis `ALLOW_PRODUCTION_DEPLOY=1` gesetzt ist (`vercel.json` → `scripts/vercel-ignore.sh`) |

Arbeitsweise: Änderungen zuerst auf `staging` pushen und prüfen, dann `staging` nach `main` mergen. `main` geht erst live, wenn du es bewusst freischaltest (siehe `docs/GO-LIVE-CHECKLIST.md`).

> **Wichtig:** `APP_ENV` gehört **nicht** in den Scope „Production“, solange dort nichts live ist. Der Wächter zeigt in der Fehlerseite an, *woher* die Umgebung stammt (`APP_ENV` oder `VERCEL_ENV`). Ein Preview-Deployment ist ohne Zutun immer `staging`; ein Preview mit `APP_ENV=production` wird blockiert.

## 1 · Neon-Datenbank mit dem Scope „Preview“ verbinden
1. Vercel → **Storage** → deine Neon-Datenbank → Projekt `mara-onlineshop-qbar` verbinden.
2. **Environments: Preview** anhaken (Production nur, wenn du dort dieselbe Testdatenbank willst – für „nichts live“ nicht nötig).
3. **Custom Prefix leer lassen.** Die Option „eine Datenbank-Branch pro Preview-Deployment anlegen“ **ausschalten**, sonst bekäme jedes Deployment eine leere Datenbank und der Seed wäre weg.
4. Die Integration setzt u. a. `DATABASE_URL` (gepoolt) und `DATABASE_URL_UNPOOLED` (direkt). Der Shop nutzt beide; `DATABASE_URL_UNPOOLED` gilt automatisch als `DIRECT_URL` für Migrationen. Eine alte, manuell angelegte `DATABASE_URL` oder `DIRECT_URL` vorher **löschen** (sonst gibt es einen Konflikt bzw. sie hat Vorrang).

## 2 · Weitere Variablen (Scope „Preview“)
| Name | Wert | Pflicht |
|---|---|---|
| `APP_ENV` | `staging` – **ohne Anführungszeichen** | empfohlen (Preview ist ohnehin staging) |
| `CRON_SECRET` | langer Zufallswert (≥ 24 Zeichen) | ja |
| `NEXT_PUBLIC_APP_URL` | nicht nötig – wird auf Previews aus der Branch-URL abgeleitet | nein |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe-**Test**modus (`sk_test_…`/`pk_test_…`/`whsec_…`) für Zahlungen im Checkout | optional |

Alternativ zu Stripe: nach dem Login unter *Admin → Einstellungen* eine IBAN eintragen → „Vorkasse“ ist wählbar.
Variablen aus `.env.example` (Admin-Passwort, `STORAGE_*`, `PAYPAL_*`, `MAIL_FROM` …) **nicht** übernehmen.

## 3 · Staging-Datenbank einmalig füllen (auf deinem Rechner)
Ein Hilfsskript erledigt alles und fragt die Neon-URL **verdeckt** ab (nichts wird angezeigt, gespeichert oder an jemand anderen geschickt):
```bash
git clone https://github.com/Mudilisabetta47/mara-onlineshop.git   # oder im vorhandenen Klon: git pull
cd mara-onlineshop && git checkout staging
npm install
npm run seed:staging
```
Das Skript
1. fragt die **Neon-URL** ab: Neon-Konsole → dein Projekt → **Connect** → „Connection pooling“ **ausschalten** → Connection String kopieren (mit Passwort; Vercel zeigt „Sensitive“-Werte nicht an). Ein Pooler-Host wird automatisch auf die direkte Verbindung umgestellt.
2. zeigt nur **Host und Datenbankname** und verlangt die Bestätigung „staging“. Es **verweigert** lokale Hosts, `lumi_shop` und Namen mit „prod/production“.
3. prüft/wendet die **Migrationen** an, führt den **Demo-Seed** aus und legt den **Admin** an (E-Mail eingeben; Passwort verdeckt eingeben oder Enter für ein zufälliges).
4. prüft in der Datenbank: Kategorien, Produkte, Varianten, Inventar, Admin.
5. optional (Staging-URL eingeben): prüft `/api/health` und `/shop`. Bei Vercel Authentication (401) stattdessen im Browser öffnen.

Danach ist im Shop sofort alles da (Seiten werden bis zu 60 Sekunden zwischengespeichert; bei leerer Ansicht kurz warten und neu laden).

## 4 · Öffnen
Vercel → **Deployments** → Eintrag mit Branch **`staging`** (Kennzeichen *Preview*) → **Visit**.
Die stabile Branch-URL hat das Muster `https://<projekt>-git-staging-<team>.vercel.app` (bei langen Namen von Vercel gekürzt – genaue URL steht im Deployment unter *Domains*).
Prüfen: `/api/health` → `{"status":"ok", …}`, dann Shop, `/login`, `/admin`.
Preview-URLs sind standardmäßig durch **Vercel Authentication** geschützt (du musst bei Vercel eingeloggt sein). Stripe-Webhooks erreichen eine geschützte Preview-URL nur mit „Protection Bypass“ – für erste Tests ohne Webhook reicht die Rückkehr-Verifizierung.

## Fehlerbilder
| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| „Der Shop ist nicht korrekt konfiguriert – Umgebung: production (aus Vercel-Umgebung VERCEL_ENV; APP_ENV … nicht gesetzt/ungültig)“ | Du siehst ein **Production**-Deployment; `APP_ENV` fehlt dort oder ist ungültig | Für Tests den **`staging`-Branch** (Preview) öffnen. Production bleibt bis zum Livegang ungenutzt |
| dasselbe mit „APP_ENV ist gesetzt, aber ungültig“ | Wert mit Tippfehler | genau `staging` (Anführungszeichen/Leerzeichen werden toleriert, Tippfehler nicht) |
| Fehlerseite listet Variablen (staging) | Konfiguration unvollständig | die genannten Variablen im Scope **Preview** setzen, Redeploy |
| Build: „Fehlt in der Vercel-Umgebung: DATABASE_URL / DIRECT_URL“ | Variablen fehlen im Scope **Preview** (Änderungen wirken erst nach Redeploy) | Schritt 1/2; die Integration muss **Preview** enthalten |
| Build: `P1001` / `P1000` mit Neon | `channel_binding=require` o. Ä., Neon-Projekt pausiert | URL neu aus Neon kopieren; Neon-Dashboard öffnen (weckt die DB) |
| `/api/health` → 503 `"status":"down"` | Datenbank/Schema nicht erreichbar oder nicht angewendet | `curl -H "Authorization: Bearer <CRON_SECRET>" "https://<preview-url>/api/health?detail=1"` (Fehlertext ohne Passwort; bei Vercel Authentication zusätzlich Bypass-Token/Login) |
| Shop leer (keine Produkte) | Seed nicht ausgeführt | Schritt 3 |
| Checkout: „keine Zahlungsart“ | Weder Stripe noch IBAN konfiguriert | Stripe-Testschlüssel setzen oder IBAN im Admin |
| Push auf `main` „übersprungen“ | gewollt: Production ist gesperrt | für den Livegang `ALLOW_PRODUCTION_DEPLOY=1` (Scope Production) setzen – erst nach der Checkliste |
