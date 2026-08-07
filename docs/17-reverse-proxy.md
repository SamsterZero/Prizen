# Production reverse proxy

Prizen remains fully self-hosted behind either Caddy or Nginx. Keep its published application port
on `127.0.0.1`; PostgreSQL, migrations, initialization, and the tracker expose no host ports.

## Normal installation

Prizen configures PostgreSQL automatically, generates its database password, and stores it in the
persistent `prizen_secrets` volume. A normal installation only needs its public HTTPS origin:

```sh
export ORIGIN=https://prices.example.com
docker compose -f compose.release.yaml up -d --wait
```

`ORIGIN` must be the exact public HTTP or HTTPS origin, without a path. Do not configure or expose
PostgreSQL unless the installation has an operational reason to override the defaults.

Prizen uses the fixed `ORIGIN` as its trust boundary and does not trust forwarded host or protocol
headers by default. This prevents a direct client from spoofing the external URL. HTTPS origins also
make session cookies `Secure`. Keep the application bound to localhost and allow only the reverse
proxy to reach it.

## Advanced database override

Operators who need custom PostgreSQL identifiers or an initial password may set these values before
the first installation:

```sh
export PRIZEN_DB_USER=prizen_app
export PRIZEN_DB_NAME=prizen_app
export PRIZEN_DATABASE_PASSWORD="$(openssl rand -hex 24)"
```

The password is written once to `prizen_secrets`; changing the environment later does not rotate an
existing database. Remove the password from the environment after initialization. Database names
and users should contain only letters, digits, and underscores.

Database credentials are intentionally not editable in the application UI. Safe rotation requires
coordinating the PostgreSQL role, persistent secret, app, migration service, and tracker while they
are stopped. Back up both `pgdata` and `prizen_secrets` before an operator-managed rotation.

## Caddy

```caddyfile
prices.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

Caddy obtains and renews HTTPS certificates automatically when DNS points to the server and ports
80 and 443 are reachable.

## Nginx

```nginx
server {
	listen 443 ssl;
	server_name prices.example.com;

	ssl_certificate /etc/letsencrypt/live/prices.example.com/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/prices.example.com/privkey.pem;

	location / {
		proxy_pass http://127.0.0.1:3000;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
```

Terminate TLS at the proxy and do not publish Prizen's PostgreSQL port. No Prizen-operated account,
database, proxy, certificate service, or control plane is required.
