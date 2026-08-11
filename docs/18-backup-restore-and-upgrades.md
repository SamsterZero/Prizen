# Backup, Restore, Upgrade, and Rollback

These procedures apply to the production `compose.release.yaml` stack. Run them from the directory
containing that file. The examples use Docker; set `CONTAINER_ENGINE=podman` for Podman.

Download `backup-release.sh` and `restore-release.sh` from the same GitHub Release as the installed
Compose file. Keeping all three assets at one version avoids running an incompatible lifecycle tool.

## Create a backup

Keep the database and `prizen_secrets` volume together. Database values such as marketplace and
notification credentials are encrypted with the key in that volume and cannot be recovered without
it.

```sh
bash scripts/backup-release.sh ./backups
```

After the dump, secrets archive, and checksums complete, the script records a successful local
maintenance event. The Operations dashboard uses that marker to report backup freshness without
mounting the host backup directory into the application container. Backups created by other tools
are not visible there. A restored dump contains the marker from the preceding successful backup;
create a new verified backup after restoration to refresh the dashboard status.

The command creates a private, timestamped directory containing a PostgreSQL custom-format dump,
the secrets archive, metadata, and SHA-256 checksums. Copy the complete directory to encrypted,
owner-controlled storage. Never commit it, upload it to an issue, or store it beside the only Prizen
host.

## Restore or roll back

Restoring replaces the current database and runtime secrets. Preserve a separate backup of the
current state before continuing.

```sh
PRIZEN_RESTORE_CONFIRM=restore \
  bash scripts/restore-release.sh ./backups/prizen-YYYYMMDDTHHMMSSZ
```

The restore verifies checksums, stops writers, restores the original encryption key and database,
then starts the stack and waits for health checks. Afterward, sign in and verify settings, tracked
products, price history, and notification configuration.

To roll back an upgrade, restore the backup created immediately before it and set `PRIZEN_IMAGE` to
the previous immutable version before starting the stack. Changing only the image is not a database
rollback.

## Upgrade safely

1. Read the target release notes and download its matching Compose asset.
2. Create a backup and copy it off-host.
3. Pin `PRIZEN_IMAGE` to the target full version; release candidates never use `latest`.
4. Run `docker compose -f compose.release.yaml up -d --wait`.
5. Check `docker compose -f compose.release.yaml ps` and `logs migrate`.
6. Verify login, owner settings, tracked products, recent price history, and notification settings.
7. Keep the pre-upgrade backup through the rollback window.

## Retention and deletion

The installation owner chooses the retention period and is responsible for legal or organizational
requirements. Keep multiple generations, including at least one off-host copy, and periodically test
a restore. A useful starting policy is seven daily, four weekly, and twelve monthly backups, adjusted
for available storage and acceptable data loss.

Deleting a backup means deleting its entire directory, including `secrets.tar`, from every replica
and storage-provider recovery area. Securely dispose of retired disks and encryption-key copies.
Removing containers does not remove named volumes; use Compose volume deletion only after a verified
backup and an explicit decision to erase the installation.
