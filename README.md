# Prizen

Prizen is a self-hosted price-intelligence tool. It tracks marketplace products, preserves price history and marketplace availability, and sends record-low or target-price notifications to Discord or Telegram.

Self-hosting is a permanent product constraint, not an alternate deployment mode. There is no required Prizen cloud account or control plane: the installation owner controls PostgreSQL, container volumes, encryption keys, backups, and updates. See [Self-Hosting and Data Ownership](docs/13-self-hosting-and-data-ownership.md).

Public product information is available at `/about`, and the local-installation privacy policy is available at `/privacy`.

## Status

The hardened local MVP uses a single internal owner with no application login. It includes bounded Amazon product-page tracking by default, optional owner-configured Amazon Creators API access, encrypted notification credentials, request rate limits, durable scan retries, stale-availability handling, structured logs, and container health checks. Marketplace authorization for future Buy Assist flows belongs in Settings and remains inside a paired local browser extension.

## Run locally

```sh
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

Replace `SECRET_ENCRYPTION_KEY` and `TRACKER_TOKEN` in `.env` with separate random values before starting Prizen. Both the app and tracker must receive the same values. Existing development databases created before migrations were introduced should be updated once with `bun run db:push`; fresh deployments should use `bun run db:migrate`.

Amazon tracking defaults to bounded retail-page retrieval. This unofficial mode can break when Amazon changes its pages and may be restricted by marketplace terms. Eligible installation owners can select Creators API in Marketplace settings and save their credentials and partner tags as encrypted local data. See [Amazon data access](docs/15-amazon-creators-api.md) for the trade-offs, configuration, limitations, and throttling behavior.

## Install the released stack

A release runs the web app, tracker, PostgreSQL, and a one-shot migration as a single Compose
application. Runtime secrets are generated on first start and retained in the `prizen_secrets`
volume, so upgrades keep encrypted credentials readable.

With Docker Compose 2.34 or newer, install the published Compose application in one command:

```sh
docker compose -f oci://ghcr.io/samsterzero/prizen-stack:0.1.0 up -d --wait
```

Podman users can download `compose.release.yaml` from the matching GitHub Release and run:

```sh
podman compose -f compose.release.yaml up -d
```

The application listens only on `http://127.0.0.1:3000`; PostgreSQL is not published to the
host. Back up both `pgdata` and `prizen_secrets`. Losing `prizen_secrets` makes encrypted channel
and Creators API credentials unrecoverable.

Set `PRIZEN_PORT` before the command to use a host port other than 3000.

For a source checkout and locally built image, use Podman Compose:

```sh
export SECRET_ENCRYPTION_KEY="$(openssl rand -hex 32)"
export TRACKER_TOKEN="$(openssl rand -hex 32)"
podman compose up -d --build app tracker
podman compose ps
```

For an existing early-MVP volume, run `podman compose run --rm app bun run db:push:container` once instead of `db:migrate`, then start the upgraded services. Prizen reuses the oldest existing owner record so previously tracked products and channels remain available.

The local Compose stack applies migrations automatically before starting the app and tracker. The
database stores all local data in the `pgdata` volume. Compose ports bind to `127.0.0.1` because
local mode intentionally has no application login. Inspect tracker output with
`podman logs --tail 100 prizen-tracker-1`.

## Documentation

The complete product and engineering specification is in [docs](docs): vision, architecture, modules, database, business rules, API, workflows, UI, repository conventions, AI development policy, and roadmap.

- [Project guide](PROJECT.md) explains milestones, planning fields, and the definition of done.
- [Contributing guide](CONTRIBUTING.md) covers setup, validation, pull requests, and architectural requirements.
- [Security policy](SECURITY.md) explains private vulnerability reporting and supported versions.
- [Release guide](docs/14-releasing.md) documents versioning, GHCR images, provenance, and rollback.
- [Amazon data access](docs/15-amazon-creators-api.md) documents the default and optional tracking modes.
- [Tracking MVP acceptance](docs/16-tracking-mvp-acceptance.md) defines reproducible release gates.
- [Changelog](CHANGELOG.md) records notable changes by release.
- [GitHub Roadmap](https://github.com/users/SamsterZero/projects/4) tracks actionable work.

## License

Prizen is licensed under the [Apache License 2.0](LICENSE).
