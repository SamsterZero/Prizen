# Tracking MVP Release Acceptance

Run this procedure for every Tracking MVP release candidate. Record the candidate commit or
image digest, operator, date, commands, and results. A release passes only when every required
check below has evidence and no unexplained failure.

## Safety and prerequisites

- Use a disposable host or a dedicated Compose project with no valuable Prizen data.
- The fresh-install step deletes the selected project's containers and PostgreSQL volume.
- Install curl and Docker Compose or Podman Compose.
- Start from the release commit or immutable release image being accepted.
- Do not use real Discord, Telegram, Amazon API, or marketplace credentials unless that
  integration is intentionally under test.

Set an isolated project name when the Compose implementation supports it:

```sh
export COMPOSE_PROJECT_NAME=prizen-acceptance
export COMPOSE_FILE=compose.release.yaml
```

The release stack generates its encryption key, tracker token, and database password on first
start. They persist in the project-owned `prizen_secrets` volume.

## 1. Secret initialization

Start the initializer twice and confirm it preserves the same non-empty files:

```sh
docker compose run --rm init
docker compose run --rm init
docker compose run --rm --entrypoint sh init -c \
  'test -s /run/secrets/prizen/encryption-key && test -s /run/secrets/prizen/tracker-token && test -s /run/secrets/prizen/database-password'
```

For Podman, replace `docker compose` with `podman compose` throughout this guide. Never delete or
replace the secrets volume independently of the database backup it belongs to.

## 2. Fresh containerized installation

The first command is destructive for `COMPOSE_PROJECT_NAME`.

```sh
docker compose down --volumes
docker compose up --detach --wait --wait-timeout 180
docker compose ps
curl --fail --show-error http://127.0.0.1:3000/api/health
```

Expected:

- `app`, `db`, and `tracker` are healthy;
- the health endpoint returns `{"status":"ok"}`;
- opening `http://127.0.0.1:3000/dashboard` initializes the local owner without a Prizen account;
- PostgreSQL data and installation secrets are stored in project-owned named volumes;
- the database is not exposed on a host port.

## 3. Core tracking workflow

1. Open the dashboard and add a direct Amazon India or Amazon US product URL.
2. Confirm preview data appears and the product remains after a page reload.
3. Set a polling interval and target price.
4. After a successful scan, confirm price history and availability update.
5. If testing notifications, configure a dedicated Discord webhook or Telegram bot/chat and
   confirm its verification message and a qualifying alert.

Automated evidence for product intake, persistence, record-low/target events, provider delivery,
and failure backoff is produced by:

```sh
ALLOW_INTEGRATION_DB_RESET=true bun run test:integration
bun run test:e2e
```

`test:integration` intentionally truncates its database and therefore requires
`ALLOW_INTEGRATION_DB_RESET=true`; run it only against disposable PostgreSQL. CI supplies both.

## 4. Tracker restart and retry recovery

```sh
docker compose restart tracker
docker compose up --detach --wait --wait-timeout 180 tracker
docker compose ps tracker
docker compose logs --since 5m tracker
```

Expected: the tracker becomes healthy again, records a fresh heartbeat, and resumes durable jobs.
The integration suite must also pass its abandoned-running-job and failed-notification retry
scenarios. Those tests prove a stale lock is reclaimed and a failed Discord or Telegram delivery
is retained, backed off, retried, and marked sent after recovery.

## 5. No Prizen cloud dependency

During the run, confirm:

- no Prizen account, license server, sync service, hosted database, or control plane is requested;
- core state remains in the local PostgreSQL volume;
- telemetry is disabled unless `ENABLE_TELEMETRY=true` is explicitly set;
- outbound requests are limited to the selected marketplace and owner-configured notification or
  telemetry endpoints;
- stopping optional notification access does not stop product persistence or administration.

This is an architectural release gate. Any required Prizen-operated endpoint is a failure.

## 6. Marketplace limitations

- Default Amazon HTML mode is unofficial, makes one bounded retail-page request, and can fail when
  markup changes or Amazon presents a challenge or rate limit.
- It does not provide verified seller, parent-variant, or customer-specific delivery context.
- Amazon Creators API mode is optional and requires eligible Associates credentials plus a valid
  partner tag for each target marketplace.
- Creators API offers use marketplace-default delivery context, not the saved local pincode.
- There is no automatic fallback between HTML and Creators API modes.
- Tracker throttling and transient failures are retried with bounded exponential backoff; stale
  availability is shown as unknown rather than treated as fresh.

See [Amazon Data Access](15-amazon-creators-api.md) for the complete operating limitations.

## Sign-off record

| Gate          | Required evidence                                           | Result      |
| ------------- | ----------------------------------------------------------- | ----------- |
| Configuration | Generated secrets exist and survive repeated initialization | Pass / Fail |
| Fresh install | Build/migration logs, healthy `compose ps`, health response | Pass / Fail |
| Core workflow | Persisted product and scan/notification test results        | Pass / Fail |
| Recovery      | Tracker restart health and integration recovery tests       | Pass / Fail |
| Independence  | Observed endpoints and local data ownership confirmed       | Pass / Fail |
| Limitations   | Marketplace limitations reviewed for the candidate          | Pass / Fail |

Record follow-up defects with links. Do not approve the release while a required gate is failed or
unverified.
