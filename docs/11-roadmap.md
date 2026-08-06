# Roadmap

GitHub issues are the source of truth for actionable work, and the [Prizen Roadmap](https://github.com/users/SamsterZero/projects/4) shows live status, priority, area, and risk. This document records the intended release sequence and durable exit criteria.

## Completed foundation

- [x] Vision, architecture, module, database, workflow, UI, and API specifications
- [x] Initial domain schema and module contracts
- [x] Persistent dashboard and price history
- [x] Tracker health checks, retry loop, and structured logs
- [x] Public About and local-first Privacy Policy pages

## v0.1 — Tracking MVP Completion

- [ ] Amazon adapter with compliant data access
- [x] Product intake endpoint and first scan
- [x] Discord and Telegram channels
- [x] Record-low notification delivery and retry scheduling
- [x] Price-history charts
- [x] Availability tracking
- [x] Target-price alerts
- [x] Durable background job queue
- [ ] End-to-end tracking and notification coverage
- [ ] Reproducible containerized release acceptance checklist

## v0.2 — Self-Hosted Operations

- [ ] Replace production `db:push` with deterministic migrations
- [ ] Harden Compose and reverse-proxy configuration
- [ ] Test backup, restore, upgrade, and rollback procedures
- [ ] Document resource guidance and disaster recovery

## v0.3 — Intelligence & Marketplace Expansion

- [ ] Trend analytics and filtering
- [ ] Second compliant marketplace adapter
- [ ] Local operations dashboard
- [ ] Retention and storage visibility

## v1.0 — Production Readiness & AdSense

- [ ] CI gates for formatting, linting, type checks, tests, and container health
- [ ] Dependency, container-image, accessibility, and performance review
- [ ] Production release, rollback, and deployment documentation
- [ ] Optional Google AdSense integration limited to approved public pages
- [ ] Owner-controlled AdSense configuration, disabled by default
- [ ] `ads.txt`, privacy, consent, and Content Security Policy review
- [ ] Verification that private routes never load advertising resources

AdSense is a release gate only when advertising is enabled for the production distribution. It must never be required for core tracking, administration, or self-hosted operation.

## v1.x — Optional Local Buy Assist

- [x] Marketplace-neutral purchase policy and final-price safety evaluation
- [ ] Browser-extension pairing with revocable, scoped device credentials
- [ ] Signed, expiring purchase-intent delivery
- [ ] Confirm-mode checkout handoff (default)
- [ ] Locally executed armed mode (experimental and opt-in)
- [ ] Checkout risk review and audit trail
- [ ] Personalized deal assistance
- [ ] Marketplace capability adapters (cart handoff and assisted checkout)

Armed auto-buy remains experimental, local, and explicit opt-in. It must enforce spending limits, duplicate-purchase prevention, immediate revocation, complete auditability, and fail-closed verification.
