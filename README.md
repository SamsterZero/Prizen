# Prizen

Prizen is a self-hosted price-intelligence tool. It tracks marketplace products, preserves price history, tracks delivery-aware availability, and sends record-low or target-price notifications to Discord or Telegram.

Self-hosting is a permanent product constraint, not an alternate deployment mode. There is no required Prizen cloud account or control plane: the installation owner controls PostgreSQL, container volumes, encryption keys, backups, and updates. See [Self-Hosting and Data Ownership](docs/13-self-hosting-and-data-ownership.md).

Public product information is available at `/about`, and the local-installation privacy policy is available at `/privacy`.

## Status

The hardened local MVP uses a single internal owner with no application login. It includes encrypted integration credentials, a configurable Amazon India delivery pincode, request rate limits, durable scan retries, stale-availability handling, structured logs, and container health checks. Marketplace authorization for future Buy Assist flows belongs in Settings and remains inside a paired local browser extension.

## Run locally

```sh
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

Replace `SECRET_ENCRYPTION_KEY` and `TRACKER_TOKEN` in `.env` with separate random values before starting Prizen. Both the app and tracker must receive the same values. Existing development databases created before migrations were introduced should be updated once with `bun run db:push`; fresh deployments should use `bun run db:migrate`.

For the full self-hosted stack, use Podman Compose:

```sh
export SECRET_ENCRYPTION_KEY="$(openssl rand -hex 32)"
export TRACKER_TOKEN="$(openssl rand -hex 32)"
podman compose run --rm app bun run db:migrate
podman compose up -d --build app tracker
podman compose ps
```

For an existing early-MVP volume, run `podman compose run --rm app bun run db:push:container` once instead of `db:migrate`, then start the upgraded services. Prizen reuses the oldest existing owner record so previously tracked products and channels remain available.

The database stores all local data in the `pgdata` volume. Compose ports bind to `127.0.0.1` because local mode intentionally has no application login. `app`, `db`, and `tracker` report health through Compose; inspect tracker output with `podman logs --tail 100 prizen-tracker-1`.

## Documentation

The complete product and engineering specification is in [docs](docs): vision, architecture, modules, database, business rules, API, workflows, UI, repository conventions, AI development policy, and roadmap.

- [Project guide](PROJECT.md) explains milestones, planning fields, and the definition of done.
- [Contributing guide](CONTRIBUTING.md) covers setup, validation, pull requests, and architectural requirements.
- [GitHub Roadmap](https://github.com/users/SamsterZero/projects/4) tracks actionable work.

## License

Prizen is licensed under the [Apache License 2.0](LICENSE).
