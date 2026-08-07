# Prizen

Prizen is a self-hosted price tracker for marketplace products. It records price and availability
history and sends record-low or target-price alerts to Discord or Telegram. No Prizen cloud
account or control plane is required.

**Quick links:** [Install](#install) · [Status](#status) · [Current version](#v010-rc1) ·
[User guide](https://github.com/SamsterZero/Prizen/wiki) ·
[Troubleshooting](https://github.com/SamsterZero/Prizen/wiki/Troubleshooting) ·
[Release notes](https://github.com/SamsterZero/Prizen/releases)

## Install

The current installable version is `v0.1.0-rc.1`. It runs the app, tracker, PostgreSQL, automatic
migrations, and persistent secret initialization as one Compose application.

### Docker

Requires Docker Compose 2.34 or newer:

```sh
docker compose -f oci://ghcr.io/samsterzero/prizen-stack:0.1.0-rc.1 up -d --wait
```

### Podman

```sh
curl --fail --location --output compose.release.yaml \
  https://github.com/SamsterZero/Prizen/releases/download/v0.1.0-rc.1/compose.release.yaml

PRIZEN_IMAGE=ghcr.io/samsterzero/prizen:0.1.0-rc.1 \
  podman compose -f compose.release.yaml up -d
```

Open `http://127.0.0.1:3000`. Set `PRIZEN_PORT` before installation to use another host port.
Back up both the `pgdata` and `prizen_secrets` volumes; both are required for recovery.

Application images, Compose applications, and release assets use the same version. Pin versions
for reproducible installs; `latest` is reserved for stable releases.

## Status

Prizen is currently a local Tracking MVP release candidate. Amazon product-page retrieval is the
default tracking method. Eligible owners can optionally configure Amazon Creators API credentials,
which are encrypted in the local database. See [Amazon data access](docs/15-amazon-creators-api.md)
for limitations.

<!-- Add each new version section directly below this comment so versions remain newest-first. -->

## v0.1.0-rc.1

- Tracks Amazon prices and availability on configurable polling intervals
- Stores price history and detects record lows and target-price crossings
- Sends Discord and Telegram notifications
- Supports default page retrieval and optional owner-configured Creators API access
- Recovers durable scan jobs with bounded retries and failure backoff
- Provides versioned Docker and Podman deployment, health checks, migrations, and generated secrets

[Full v0.1.0-rc.1 release notes](https://github.com/SamsterZero/Prizen/releases/tag/v0.1.0-rc.1)

## Documentation

- [Wiki home](https://github.com/SamsterZero/Prizen/wiki)
- [Installation](https://github.com/SamsterZero/Prizen/wiki/Installation) ·
  [Configuration](https://github.com/SamsterZero/Prizen/wiki/Configuration)
- [Updating and rollback](https://github.com/SamsterZero/Prizen/wiki/Updating-and-Rollback) ·
  [Backup and restore](https://github.com/SamsterZero/Prizen/wiki/Backup-and-Restore)
- [Amazon tracking](https://github.com/SamsterZero/Prizen/wiki/Amazon-Tracking) ·
  [Notifications](https://github.com/SamsterZero/Prizen/wiki/Notifications)
- [Troubleshooting](https://github.com/SamsterZero/Prizen/wiki/Troubleshooting) ·
  [Releases](https://github.com/SamsterZero/Prizen/wiki/Releases)
- [Engineering documentation](docs) ·
  [Tracking MVP acceptance checklist](docs/16-tracking-mvp-acceptance.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)
- [Project roadmap](https://github.com/users/SamsterZero/projects/4)

## License

Prizen is licensed under the [Apache License 2.0](LICENSE).
