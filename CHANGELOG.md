# Changelog

All notable changes to Prizen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0-rc.1] - 2026-08-07

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

[Unreleased]: https://github.com/SamsterZero/Prizen/compare/v0.2.0-rc.1...HEAD
[0.2.0-rc.1]: https://github.com/SamsterZero/Prizen/compare/v0.1.0...v0.2.0-rc.1
[0.1.0]: https://github.com/SamsterZero/Prizen/releases/tag/v0.1.0
