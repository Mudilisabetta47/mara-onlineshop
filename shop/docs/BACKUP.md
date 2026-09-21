# Backup- & Wiederherstellungsstrategie

> Ziel: **RPO ≤ 5 Minuten** (max. Datenverlust), **RTO ≤ 4 Stunden** (Wiederherstellungszeit). Die konkreten Werte hängen vom gewählten Datenbank-Tarif ab und müssen dort bestätigt werden.

## Was gesichert werden muss

| Daten | Wo | Kritikalität |
|---|---|---|
| PostgreSQL (Bestellungen, Kunden, Bestände, Verträge …) | Production-Datenbank | **Kritisch** – Bestell-/Rechnungsdaten unterliegen gesetzlichen Aufbewahrungsfristen |
| Objekt-Storage (Rechnungs-PDFs, Vertragsdokumente, Produktbilder) | S3-Bucket | **Kritisch** (Rechnungen), hoch (Bilder) |
| Konfiguration/Secrets | Vercel Env Vars, Stripe/PayPal/Resend-Konten | Kopie im Passwortmanager (Team-Tresor), **nicht** im Repo |
| Code | Git-Repository | Remote (GitHub) |

## Drei Schichten (alle drei einrichten)

**1. Provider-Backup mit Point-in-Time-Recovery (PITR)** – primär.
Bei Neon/Supabase/AWS RDS: PITR aktivieren und Aufbewahrung ≥ 7 Tage wählen (Tarif prüfen: kostenlose Tarife haben teils nur Stunden). Wiederherstellung auf einen Zeitpunkt in einen *neuen* Branch/Instanz, dann umschalten.

**2. Tägliche logische Sicherung außerhalb des Providers** – schützt vor Provider-/Konto-Ausfall und Fehlbedienung.
Script: `scripts/backup-db.sh` (`pg_dump` Custom-Format, optional GPG-verschlüsselt, Aufbewahrung `BACKUP_KEEP_DAYS`, Standard 30). Beispiel-Workflow für GitHub Actions (Secrets `PROD_DIRECT_URL`, `BACKUP_S3_*`, `BACKUP_GPG_PUBLIC_KEY` im Repository-Settings anlegen – niemals im Code):

```yaml
name: DB-Backup
on: { schedule: [{ cron: "17 2 * * *" }], workflow_dispatch: {} }
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y postgresql-client-16 gnupg awscli
      - run: |
          echo "${{ secrets.BACKUP_GPG_PUBLIC_KEY }}" | gpg --import
          DIRECT_URL="${{ secrets.PROD_DIRECT_URL }}" BACKUP_DIR=./b BACKUP_GPG_RECIPIENT="${{ vars.BACKUP_GPG_RECIPIENT }}" ./shop/scripts/backup-db.sh
      - run: aws s3 cp ./b/ "s3://${{ vars.BACKUP_BUCKET }}/db/" --recursive   # anderer Anbieter/Konto als die Production-Daten
        env: { AWS_ACCESS_KEY_ID: "${{ secrets.BACKUP_S3_KEY }}", AWS_SECRET_ACCESS_KEY: "${{ secrets.BACKUP_S3_SECRET }}", AWS_DEFAULT_REGION: eu-central-1 }
```
Der Backup-Bucket: **anderes Konto/anderer Anbieter** als die Live-Daten, Versionierung an, Lifecycle (z. B. 30 Tage täglich, 12 Monate monatlich), kein Löschrecht für den Backup-Schlüssel.

**3. Storage-Schutz**
- AWS S3: Versionierung + Lifecycle + optional Object Lock (Compliance) für `private/…`-Rechnungen; `S3_SSE=1`.
- Cloudflare R2 / Hetzner: (nach meinem Kenntnisstand keine Objekt-Versionierung – bitte beim Anbieter prüfen) → nächtliche Synchronisation in einen zweiten Bucket (`rclone sync` / `aws s3 sync`).
- Zugriffsschlüssel nur auf den einen Bucket beschränken, Bucket privat lassen (Auslieferung läuft über die App).

## Wiederherstellung (Runbook)

1. **Entscheiden:** Datenfehler (→ PITR auf Zeitpunkt vor dem Fehler) oder Totalverlust (→ letzter logischer Dump).
2. **Neue** Datenbank anlegen (nie in die bestehende zurückspielen, bevor sie gesichert ist).
3. `pg_restore --no-owner --dbname "<neue DIRECT_URL>" shop-<datum>.dump` (bei `.gpg`: erst `gpg --decrypt`).
4. Prüfen: `SELECT count(*) FROM "Order"`, `"Product"`, `"User"`; `npm run db:status` (Migrationen angewendet?).
5. In Vercel `DATABASE_URL`/`DIRECT_URL` auf die neue Datenbank stellen → Redeploy → `/api/health?detail=1` prüfen.
6. Stripe-Zahlungen im Ausfallfenster abgleichen (Dashboard → Zahlungen): fehlende Bestellungen nachpflegen; Webhook-Events lassen sich im Dashboard erneut senden (Verarbeitung ist idempotent).
7. Vorfall dokumentieren.

**Wiederherstellungsübung (Pflicht, mind. quartalsweise, vor dem Livegang einmal):** Dump in eine Wegwerf-Datenbank einspielen und Zeilenzahlen prüfen. Lokal verifiziert am 2026-09-21: `pg_dump` → `pg_restore` in temporäre DB → 24 Produkte / 7 Bestellungen / 5 Nutzer identisch wiederhergestellt (Dauer < 5 s bei 100 KB).

## Aufbewahrung & Datenschutz
- Rechnungen/Buchungsbelege unterliegen gesetzlichen Aufbewahrungsfristen (aktuell 8 bzw. 10 Jahre je Beleg-Art – **Steuerberater bestätigen lassen**). Das Löschen eines Kundenkontos entfernt Konto/Adressen/Wunschliste, Bestellungen bleiben anonymisiert erhalten (siehe Datenschutzerklärung).
- Backups enthalten personenbezogene Daten: verschlüsseln, Zugriff beschränken, Aufbewahrung begrenzen (30 Tage täglich) und in der Datenschutzerklärung/Verarbeitungsverzeichnis erwähnen. Gelöschte Kundendaten verschwinden aus Backups mit Ablauf der Aufbewahrung.
