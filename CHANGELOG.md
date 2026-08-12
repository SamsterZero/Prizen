# Changelog

All notable changes to Prizen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0-rc.3] - 2026-08-12

### Fixed

- Release acceptance now verifies observable settings hydration before replacing form values

## [0.3.0-rc.2] - 2026-08-12

### Fixed

- Release acceptance now waits for asynchronous settings hydration before exercising form actions

## [0.3.0-rc.1] - 2026-08-11

### Added

- Local price trend, volatility, time-range, and marketplace analytics with bounded history queries
- Flipkart tracking through bounded public-page retrieval, with an optional owner-configured Affiliate
  API integration
- Local Operations dashboard for tracker heartbeat, scan queue, notification delivery, database
  storage, and backup freshness
- Additive maintenance-event migration for recording successful backups without exposing host paths

### Changed

- Dashboard and product analytics now handle sparse, stale, unavailable, and filtered data explicitly
- Large dashboard metrics use compact notation such as `12.5K` and `2.3M`
- Operations and Settings navigation is consistently available on application pages other than the
  landing page
- Local Compose configuration preserves the established PostgreSQL 17 data and secret volumes

### Security

- Operations diagnostics remain local and exclude raw errors, marketplace URLs, notification
  destinations, tokens, credentials, and other sensitive values
- Optional marketplace API credentials remain encrypted and no hosted intermediary is required

## [0.2.0] - 2026-08-07

### Added

- Integrity-checked PostgreSQL and encrypted-secret backup bundles
- Guarded restore and rollback procedure with automated recovery verification
- Tested preservation of tracked price history, owner settings, and encryption keys
- Retention and secure-deletion guidance for installation owners

### Changed

- Pull requests use fast smoke and path-sensitive browser coverage; complete acceptance runs before
  releases, on manual dispatch, and weekly

## [0.1.0] - 2026-08-07

### Added

- Initial containerized self-hosted price-tracking application
- Price and availability history with target-price alerts
- Discord and Telegram notification channels
- Project governance, security policy, CI, and release automation
- Optional Amazon catalog and offer tracking through the owner-configured Creators API
- End-to-end coverage for product intake, scan persistence, notification delivery, and retries
- Reproducible Tracking MVP release acceptance and recovery checks
- One-command production Compose deployment with persistent generated secrets and explicit migrations

[Unreleased]: https://github.com/SamsterZero/Prizen/compare/v0.3.0-rc.3...HEAD
[0.3.0-rc.3]: https://github.com/SamsterZero/Prizen/compare/v0.3.0-rc.2...v0.3.0-rc.3
[0.3.0-rc.2]: https://github.com/SamsterZero/Prizen/compare/v0.3.0-rc.1...v0.3.0-rc.2
[0.3.0-rc.1]: https://github.com/SamsterZero/Prizen/compare/v0.2.0...v0.3.0-rc.1
[0.2.0]: https://github.com/SamsterZero/Prizen/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SamsterZero/Prizen/releases/tag/v0.1.0
