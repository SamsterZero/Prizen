# Contributing to Prizen

Thanks for helping improve Prizen. Contributions should preserve its central promise: Prizen is a containerized, self-hosted application whose data remains under the installation owner's control.

## Before you start

- Search the [open issues](https://github.com/SamsterZero/Prizen/issues) to avoid duplicate work.
- For a bug, include reproducible steps and sanitized logs.
- For a feature, describe the problem before proposing an implementation.
- For a substantial or security-sensitive change, discuss the approach in an issue before writing code.
- Never post credentials, webhook URLs, cookies, database URLs, encryption keys, or personal data.

The [Prizen Roadmap](https://github.com/users/SamsterZero/projects/4) shows current priorities. Start with a high-priority `Todo` item in the active milestone, or ask on the issue before picking it up.

## Development setup

You need [Bun](https://bun.sh/) and either Podman Compose or Docker Compose.

```sh
bun install
cp .env.example .env
docker compose up -d db
bun run db:migrate
bun run dev
```

Replace `SECRET_ENCRYPTION_KEY` and `TRACKER_TOKEN` in `.env` with different random values. Do not commit `.env`. Podman users can substitute `podman compose` for `docker compose`.

For the complete containerized setup, follow [README.md](README.md).

## Making a change

1. Create a focused branch from `main`.
2. Keep the change scoped to one issue where practical.
3. Add or update tests for changed behavior.
4. Update documentation and `.env.example` when configuration or behavior changes.
5. Run the relevant validation commands.

```sh
bun run check
bun test
bun run lint
bun run build
```

Run `bun run test:e2e` for user-facing flows. If a command cannot be run, explain why in the pull request.

For database changes, generate and review a migration:

```sh
bun run db:generate
bun run db:migrate
```

Do not use `db:push` as a production migration strategy.

## Architectural requirements

Any feature that stores data or contacts a new service must document:

1. What is stored and where.
2. Which endpoint is contacted and why.
3. How the owner exports and deletes the data.
4. Whether the feature is optional and how it is disabled.

Core functionality must not require a Prizen-operated account, control plane, database, or relay. Marketplace credentials, cookies, addresses, and payment details must not be stored by Prizen. See [Self-Hosting and Data Ownership](docs/13-self-hosting-and-data-ownership.md).

## Pull requests

- Link the issue with `Closes #<number>` when applicable.
- Describe how the change was tested.
- Call out migrations, new environment variables, stored data, and outbound connections.
- Include screenshots for visible changes.
- Keep generated files and unrelated formatting out of the pull request.

By contributing, you agree that your contribution is submitted under the [Apache License 2.0](LICENSE).
