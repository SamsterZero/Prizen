# Prizen

Prizen is a self-hosted price tracker for marketplace products. It records price and availability
history and sends record-low or target-price alerts to Discord or Telegram. No Prizen cloud
account or control plane is required.

**Quick links:** [Install](#install) · [Status](#status) · [Versions](#versions) ·
[User guide](https://github.com/SamsterZero/Prizen/wiki) ·
[Troubleshooting](https://github.com/SamsterZero/Prizen/wiki/Troubleshooting) ·
[Release notes](https://github.com/SamsterZero/Prizen/releases)

## Install

The current stable version is `v0.2.0`. It runs the app, tracker, PostgreSQL, automatic
migrations, and persistent secret initialization as one Compose application.

### Docker

Requires Docker Compose 2.34 or newer:

```sh
docker compose -f oci://ghcr.io/samsterzero/prizen-stack:0.2.0 up -d --wait
```

### Podman

```sh
curl --fail --location --output compose.release.yaml \
  https://github.com/SamsterZero/Prizen/releases/download/v0.2.0/compose.release.yaml

PRIZEN_IMAGE=ghcr.io/samsterzero/prizen:0.2.0 \
  podman compose -f compose.release.yaml up -d
```

Open `http://127.0.0.1:3000`. Set `PRIZEN_PORT` before installation to use another host port.
Back up both the `pgdata` and `prizen_secrets` volumes; both are required for recovery.

Application images, Compose applications, and release assets use the same version. Pin versions
for reproducible installs; `latest` is reserved for stable releases.

## Status

Prizen `v0.2.0` is the stable local Tracking MVP. Amazon product-page retrieval is the default
tracking method. Eligible owners can optionally configure Amazon Creators API credentials, which
are encrypted in the local database. See [Amazon data access](docs/15-amazon-creators-api.md) for
limitations.

## Versions

See [GitHub Releases](https://github.com/SamsterZero/Prizen/releases) for available versions,
features, changes, and installation assets. Pin an explicit version for reproducible deployments.

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
  [Production reverse proxy](docs/17-reverse-proxy.md) ·
  [Backup, restore, and upgrades](docs/18-backup-restore-and-upgrades.md) ·
  [Tracking MVP acceptance checklist](docs/16-tracking-mvp-acceptance.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)
- [Project roadmap](https://github.com/users/SamsterZero/projects/4)

## License

Prizen is licensed under the [Apache License 2.0](LICENSE).
