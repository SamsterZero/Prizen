#!/usr/bin/env bash

set -euo pipefail

backup_dir="${1:-}"
project_name="${PRIZEN_PROJECT_NAME:-prizen}"
compose_file="${PRIZEN_COMPOSE_FILE:-compose.release.yaml}"
container_engine="${CONTAINER_ENGINE:-docker}"
database_user="${PRIZEN_DB_USER:-prizen}"
database_name="${PRIZEN_DB_NAME:-prizen}"
compose=("$container_engine" compose -p "$project_name" -f "$compose_file")

if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
	echo "Usage: PRIZEN_RESTORE_CONFIRM=restore $0 BACKUP_DIRECTORY" >&2
	exit 2
fi

if [ "${PRIZEN_RESTORE_CONFIRM:-}" != 'restore' ]; then
	echo 'Restore replaces the current database and secrets.' >&2
	echo "Rerun with PRIZEN_RESTORE_CONFIRM=restore after checking: $backup_dir" >&2
	exit 2
fi

for file in database.dump secrets.tar metadata.txt SHA256SUMS; do
	test -f "$backup_dir/$file" || {
		echo "Backup is incomplete: missing $file" >&2
		exit 1
	}
done

(
	cd "$backup_dir"
	sha256sum --check SHA256SUMS
)

echo 'Stopping application services'
"${compose[@]}" stop app tracker migrate 2>/dev/null || true

echo 'Restoring the encryption key and runtime secrets'
"${compose[@]}" run -T --rm --no-deps --entrypoint sh init \
	-c 'find /run/secrets/prizen -mindepth 1 -maxdepth 1 -type f -delete; tar -C /run/secrets/prizen -xf -; chmod 444 /run/secrets/prizen/*' \
	< "$backup_dir/secrets.tar"

echo 'Restoring PostgreSQL'
"${compose[@]}" up -d --wait db
"${compose[@]}" exec -T db dropdb -U "$database_user" --maintenance-db=postgres \
	--if-exists --force "$database_name"
"${compose[@]}" exec -T db createdb -U "$database_user" "$database_name"
"${compose[@]}" exec -T db pg_restore -U "$database_user" -d "$database_name" \
	--exit-on-error < "$backup_dir/database.dump"

echo 'Starting and health-checking the restored stack'
"${compose[@]}" up -d --wait
echo 'Restore complete. Verify login, settings, tracked products, and price history.'
