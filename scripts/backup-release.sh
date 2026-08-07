#!/usr/bin/env bash

set -euo pipefail

backup_root="${1:-backups}"
project_name="${PRIZEN_PROJECT_NAME:-prizen}"
compose_file="${PRIZEN_COMPOSE_FILE:-compose.release.yaml}"
container_engine="${CONTAINER_ENGINE:-docker}"
database_user="${PRIZEN_DB_USER:-prizen}"
database_name="${PRIZEN_DB_NAME:-prizen}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root%/}/prizen-$timestamp"
compose=("$container_engine" compose -p "$project_name" -f "$compose_file")

umask 077
mkdir -p "$backup_root"
mkdir "$backup_dir"

if ! "${compose[@]}" exec -T db pg_isready -U "$database_user" -d "$database_name" >/dev/null; then
	echo 'Prizen PostgreSQL is not ready; the backup was not created.' >&2
	exit 1
fi

echo "Backing up PostgreSQL to $backup_dir/database.dump"
"${compose[@]}" exec -T db pg_dump -U "$database_user" -d "$database_name" -Fc \
	> "$backup_dir/database.dump"

echo 'Backing up the encryption key and runtime secrets'
"${compose[@]}" run -T --rm --no-deps --entrypoint sh init \
	-c 'tar -C /run/secrets/prizen -cf - .' > "$backup_dir/secrets.tar"

cat > "$backup_dir/metadata.txt" <<EOF
created_at=$timestamp
database_name=$database_name
database_user=$database_user
project_name=$project_name
EOF

(
	cd "$backup_dir"
	sha256sum database.dump secrets.tar metadata.txt > SHA256SUMS
)

echo "Backup complete: $backup_dir"
echo 'Store this directory encrypted and separately from the Prizen host.'
