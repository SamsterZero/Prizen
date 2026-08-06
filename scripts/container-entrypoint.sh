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

if [ -d "$secret_dir" ]; then
	export SECRET_ENCRYPTION_KEY="${SECRET_ENCRYPTION_KEY:-$(read_secret encryption-key)}"
	export TRACKER_TOKEN="${TRACKER_TOKEN:-$(read_secret tracker-token)}"
	database_password="$(read_secret database-password)"
	export DATABASE_URL="${DATABASE_URL:-postgres://prizen:${database_password}@db:5432/prizen}"
fi

exec "$@"
