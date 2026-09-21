#!/usr/bin/env bash
# Logischer Datenbank-Backup (pg_dump, komprimiertes Custom-Format) – ZUSÄTZLICH zu den Provider-Backups/PITR.
# Nutzung:  DIRECT_URL=postgresql://… BACKUP_DIR=./backups ./scripts/backup-db.sh
# Verschlüsselung (optional): BACKUP_GPG_RECIPIENT=admin@firma.de
# Die URL kommt ausschließlich aus der Umgebung (nie ins Repo). Backups NICHT im Repo ablegen.
set -euo pipefail
: "${DIRECT_URL:?DIRECT_URL (direkte, nicht gepoolte Verbindung) fehlt}"
DIR="${BACKUP_DIR:-./backups}"; mkdir -p "$DIR"; chmod 700 "$DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DIR/shop-$STAMP.dump"
echo "Sichere Datenbank → $FILE"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DIRECT_URL" --file="$FILE"
if [[ -n "${BACKUP_GPG_RECIPIENT:-}" ]]; then gpg --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" "$FILE" && rm "$FILE" && FILE="$FILE.gpg"; fi
pg_restore --list "${FILE%.gpg}" >/dev/null 2>&1 || [[ "$FILE" == *.gpg ]] || { echo "✖ Backup-Datei nicht lesbar"; exit 1; }
echo "✓ $(du -h "$FILE" | cut -f1)  $FILE"
# Aufbewahrung: Dateien älter als BACKUP_KEEP_DAYS (Standard 30) löschen
find "$DIR" -name 'shop-*.dump*' -mtime +"${BACKUP_KEEP_DAYS:-30}" -delete
