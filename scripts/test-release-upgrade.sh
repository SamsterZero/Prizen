#!/usr/bin/env bash

set -euo pipefail

project_name="${PRIZEN_UPGRADE_PROJECT:-prizen-upgrade-ci}"
candidate_image="${PRIZEN_CANDIDATE_IMAGE:-prizen:local}"
compose_file="${PRIZEN_COMPOSE_FILE:-compose.release.yaml}"
container_engine="${CONTAINER_ENGINE:-docker}"
marker_slug="migration-upgrade-check"
database_user="${PRIZEN_DB_USER:-prizen}"
database_name="${PRIZEN_DB_NAME:-prizen}"
stable_manifest="tests/fixtures/migrations/v0.1.0.sha256"
stable_journal="tests/fixtures/migrations/v0.1.0-journal.sql"

compose=("$container_engine" compose -p "$project_name" -f "$compose_file")

cleanup() {
	PRIZEN_IMAGE="$candidate_image" "${compose[@]}" down --volumes --remove-orphans
}

apply_stable_migrations() {
	sha256sum --check "$stable_manifest"
	while read -r _ migration; do
		"${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -v ON_ERROR_STOP=1 \
			--single-transaction < "$migration"
	done < "$stable_manifest"
	"${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -v ON_ERROR_STOP=1 \
		--single-transaction < "$stable_journal"
}

trap cleanup EXIT

if PRIZEN_IMAGE="$candidate_image" "${compose[@]}" config | grep --fixed-strings 'db:push'; then
	echo 'Production Compose must use deterministic migrations, not db:push.' >&2
	exit 1
fi

PRIZEN_IMAGE="$candidate_image" "${compose[@]}" down --volumes --remove-orphans

echo 'Starting the v0.1.0 schema fixture'
PRIZEN_IMAGE="$candidate_image" "${compose[@]}" up --detach --wait --wait-timeout 180 db
apply_stable_migrations
"${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -v ON_ERROR_STOP=1 -c \
	"INSERT INTO marketplaces (slug, name, website_url) VALUES ('$marker_slug', 'Migration test', 'https://example.com') ON CONFLICT (slug) DO NOTHING;"

echo "Upgrading the persistent database with $candidate_image"
PRIZEN_IMAGE="$candidate_image" "${compose[@]}" down --remove-orphans
PRIZEN_IMAGE="$candidate_image" "${compose[@]}" up --detach --wait --wait-timeout 180 db
PRIZEN_IMAGE="$candidate_image" "${compose[@]}" run --rm migrate

marker_count="$("${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -At -c \
	"SELECT count(*) FROM marketplaces WHERE slug = '$marker_slug';")"
migration_count="$("${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -At -c \
	'SELECT count(*) FROM drizzle.__drizzle_migrations;')"

test "$marker_count" = "1"
test "$migration_count" -ge 3

echo "Upgrade preserved existing data and applied $migration_count deterministic migrations."
