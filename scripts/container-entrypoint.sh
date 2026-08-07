#!/bin/sh
set -eu

secret_dir="${PRIZEN_SECRETS_DIR:-/run/secrets/prizen}"

read_secret() {
	secret_file="$secret_dir/$1"
	if [ ! -s "$secret_file" ]; then
		echo "Required secret file is missing: $secret_file" >&2
		exit 1
	fi
	tr -d '\r\n' < "$secret_file"
}

urlencode() {
	bun -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

if [ -d "$secret_dir" ]; then
	export SECRET_ENCRYPTION_KEY="${SECRET_ENCRYPTION_KEY:-$(read_secret encryption-key)}"
	export TRACKER_TOKEN="${TRACKER_TOKEN:-$(read_secret tracker-token)}"
	database_password="$(read_secret database-password)"
	database_host="${PRIZEN_DB_HOST:-db}"
	database_port="${PRIZEN_DB_PORT:-5432}"
	database_user="${PRIZEN_DB_USER:-prizen}"
	database_name="${PRIZEN_DB_NAME:-prizen}"
	encoded_database_user="$(urlencode "$database_user")"
	encoded_database_password="$(urlencode "$database_password")"
	encoded_database_name="$(urlencode "$database_name")"
	export DATABASE_URL="${DATABASE_URL:-postgres://${encoded_database_user}:${encoded_database_password}@${database_host}:${database_port}/${encoded_database_name}}"
fi

exec "$@"
