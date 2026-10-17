#!/bin/sh
# Backs up the docker-compose Postgres to backups/ and keeps the newest $KEEP (default 14).
# Schedule it, e.g. daily at 02:30:  30 2 * * * cd /path/to/SheildIQ && ./scripts/backup-postgres.sh
# Restore: docker compose exec -T postgres pg_restore -U shieldiq -d shieldiq --clean --if-exists < backups/<file>.dump
set -eu
cd "$(dirname "$0")/.."
KEEP="${KEEP:-14}"
mkdir -p backups
file="backups/shieldiq-$(date +%Y%m%d-%H%M%S).dump"
# Custom format (-Fc) is compressed and restores selectively with pg_restore.
docker compose exec -T postgres pg_dump -U shieldiq -d shieldiq -Fc > "$file.partial"
mv "$file.partial" "$file" # a failed dump never replaces a good one or counts toward $KEEP
ls -1t backups/shieldiq-*.dump | tail -n +"$((KEEP + 1))" | while read -r old; do rm -f "$old"; done
echo "Backup written: $file ($(du -h "$file" | cut -f1))"
