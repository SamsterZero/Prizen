#!/usr/bin/env bash

set -euo pipefail

project_name="${PRIZEN_RECOVERY_PROJECT:-prizen-recovery-ci}"
candidate_image="${PRIZEN_CANDIDATE_IMAGE:-prizen:local}"
compose_file="${PRIZEN_COMPOSE_FILE:-compose.release.yaml}"
container_engine="${CONTAINER_ENGINE:-docker}"
database_user="${PRIZEN_DB_USER:-prizen}"
database_name="${PRIZEN_DB_NAME:-prizen}"
recovery_port="${PRIZEN_RECOVERY_PORT:-3002}"
backup_root="$(mktemp -d)"
compose=("$container_engine" compose -p "$project_name" -f "$compose_file")

cleanup() {
	PRIZEN_IMAGE="$candidate_image" "${compose[@]}" down --volumes --remove-orphans
	rm -rf "$backup_root"
}
trap cleanup EXIT

export PRIZEN_IMAGE="$candidate_image"
export PRIZEN_PROJECT_NAME="$project_name"
export PRIZEN_COMPOSE_FILE="$compose_file"
export CONTAINER_ENGINE="$container_engine"
export PRIZEN_PORT="$recovery_port"
export ORIGIN="http://localhost:$recovery_port"

"${compose[@]}" down --volumes --remove-orphans
"${compose[@]}" up -d --wait --wait-timeout 180

"${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO users (id, email, password_hash)
VALUES ('10000000-0000-0000-0000-000000000001', 'recovery@example.test', 'recovery-test-hash');
INSERT INTO user_settings (user_id, delivery_pincode)
VALUES ('10000000-0000-0000-0000-000000000001', '400001');
INSERT INTO marketplaces (id, slug, name, website_url)
VALUES ('20000000-0000-0000-0000-000000000001', 'recovery-test', 'Recovery test', 'https://example.test');
INSERT INTO products (id, user_id, marketplace_id, external_id, url, title)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'recovery-item', 'https://example.test/item', 'Recovery item'
);
INSERT INTO price_history (product_id, price, currency, availability)
VALUES ('30000000-0000-0000-0000-000000000001', 123.45, 'INR', 'in_stock');
SQL

secret_hash_before="$("${compose[@]}" run -T --rm --no-deps --entrypoint sh init -c \
	'sha256sum /run/secrets/prizen/encryption-key' | awk '{print $1}')"

bash scripts/backup-release.sh "$backup_root"
backup_dir="$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'prizen-*' -print -quit)"

"${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -v ON_ERROR_STOP=1 -c \
	"UPDATE user_settings SET delivery_pincode = '999999'; DELETE FROM price_history;"

PRIZEN_RESTORE_CONFIRM=restore bash scripts/restore-release.sh "$backup_dir"

restored_values="$("${compose[@]}" exec -T db psql -U "$database_user" -d "$database_name" -At -F '|' -c \
	"SELECT us.delivery_pincode, count(ph.id) FROM user_settings us JOIN products p ON p.user_id = us.user_id JOIN price_history ph ON ph.product_id = p.id WHERE us.user_id = '10000000-0000-0000-0000-000000000001' GROUP BY us.delivery_pincode;")"
secret_hash_after="$("${compose[@]}" run -T --rm --no-deps --entrypoint sh init -c \
	'sha256sum /run/secrets/prizen/encryption-key' | awk '{print $1}')"

test "$restored_values" = '400001|1'
test "$secret_hash_before" = "$secret_hash_after"

echo 'Backup, restore, rollback recovery, tracked history, settings, and encryption-key checks passed.'
