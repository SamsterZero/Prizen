# Self-Hosting and Data Ownership

This document is a permanent architectural decision for Prizen.

## Decision

Prizen is distributed as a self-hosted application. It will not require a
Prizen-operated cloud account, database, license server, synchronization
service, or control plane. The person running an installation owns and controls
its data.

## Ownership boundary

The installation owner controls:

- PostgreSQL data and container volumes
- Product records, price history, settings, and operational logs
- Encryption keys and encrypted notification credentials
- Backups, restores, retention, deletion, and software updates
- Browser-extension pairing and future purchase authorizations

Prizen must remain usable without contacting infrastructure operated by the
Prizen project.

## Permitted outbound connections

Core features may make transparent, purpose-specific requests to:

- Marketplaces selected by the owner, to observe products and prices
- Discord or Telegram, only when the owner configures those integrations
- An SMTP server configured by the owner
- An error-reporting endpoint configured and explicitly enabled by the owner

These connections do not transfer ownership to Prizen. Optional telemetry is
disabled by default and may point to a self-hosted endpoint.

## Purchase assistance

Marketplace passwords, cookies, addresses, and payment instruments must not be
stored in the Prizen database or sent to a Prizen-operated service. A local
browser extension may act inside the owner's existing marketplace session after
applying explicit, short-lived purchase limits.

## Product requirements

Every feature that stores new data or adds an outbound connection must document:

1. What is stored and where.
2. Which external endpoint is contacted and why.
3. How the owner exports and deletes the data.
4. Whether the feature is optional and how it is disabled.

Features that require a Prizen-operated cloud dependency are out of scope.
