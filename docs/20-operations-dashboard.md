# Local Operations Dashboard

The authenticated `/operations` route summarizes the health of one Prizen installation. It reads
local PostgreSQL state only. It does not send telemetry, enable external reporting, or expose raw
errors and sensitive marketplace or notification values.

## Metrics

### Tracker

- **Last success** is the age of the tracker's most recent successful heartbeat.
- **Last error** is the age of the most recent recorded tracker error. Error text is intentionally
  excluded.
- A heartbeat at most 90 seconds old is healthy, one at most five minutes old needs attention, and
  an older heartbeat requires action. No heartbeat produces an unknown state.

### Scan queue

- **Pending** counts scans waiting for a tracker worker.
- **Running** counts scans currently claimed by a worker.
- **Failed** counts scans in the failed state.
- **Overdue** counts pending scans whose scheduled time has passed.
- **Last successful scan** shows the age of the latest completed product check.
- **Oldest overdue** shows how long the earliest overdue scan has been waiting.

Queue statistics include only products owned by the signed-in user.

### Notifications

- **Verified** counts notification channels that have completed verification.
- **Pending** counts deliveries waiting to be sent or retried.
- **Sent · 24h** and **Failed · 24h** count delivery outcomes during the preceding 24 hours.
- **Last delivered** and **Last failed** show the ages of the latest corresponding outcomes.

Notification statistics include only channels owned by the signed-in user. Destinations, tokens,
payloads, and raw provider errors are never returned to the page.

### Storage and backup

- **Database** is the total size reported by PostgreSQL, including application data, indexes, and
  database overhead.
- **Observations** is the signed-in user's stored price-history count.
- **Added · 24h** is the number of that user's observations recorded during the preceding 24 hours.
- **Last backup** is the age of the most recent successful maintenance marker created by
  `scripts/backup-release.sh`.

A backup at most 24 hours old is healthy, one at most seven days old needs attention, and an older
backup requires action. An installation with no marker reports an unknown backup state. Backups
created by another tool are not visible because Prizen does not mount or inspect host backup paths.

## Number display

Metric cards use compact English notation to remain readable: `1K`, `12.5K`, `2.3M`, and `4B`.
Values below 1,000 remain unshortened. These labels are rounded display values; the underlying
database counts are unchanged. Storage and elapsed time use their own abbreviated units, such as
`MB`, `h`, and `d`.

## Local troubleshooting

Use the dashboard as a starting point, then inspect local service state and logs for details:

```sh
podman compose ps
podman compose logs --tail=200 tracker app db
```

For this repository's development stack, apply migrations and rebuild the required application
container without deleting data:

```sh
podman compose build migrate app
podman compose run --rm --no-deps migrate
podman compose up -d --no-deps app
```

Do not use `down --volumes`, `down -v`, or remove the PostgreSQL volume during an update. See
[Backup, Restore, Upgrade, and Rollback](18-backup-restore-and-upgrades.md) before updating a
production installation.
