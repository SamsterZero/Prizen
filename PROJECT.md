# Prizen Project Guide

Prizen is a containerized, self-hosted price-intelligence application. It tracks marketplace products, preserves price and availability history, and sends useful alerts while keeping operational data under the installation owner's control.

This file explains how work is organized. Product and engineering details live in [docs](docs), and setup instructions live in [README.md](README.md).

## Non-negotiable constraints

- Self-hosting is the only deployment model.
- PostgreSQL data, secrets, backups, logs, and updates remain owner-controlled.
- Core features cannot depend on a Prizen-operated cloud service.
- External connections must be transparent, purpose-specific, and optional where appropriate.
- Marketplace passwords, cookies, addresses, and payment instruments stay outside Prizen.
- Production deployment remains containerized.

See [Self-Hosting and Data Ownership](docs/13-self-hosting-and-data-ownership.md) for the full decision.

## Planning

Work is tracked in the [Prizen Roadmap](https://github.com/users/SamsterZero/projects/4). GitHub issues are the source of truth for actionable work; milestones describe release outcomes.

| Milestone                                       | Outcome                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `v0.1.0 — Tracking MVP Completion`              | Trustworthy, compliant price tracking and notifications                         |
| `v0.2.0 — Self-Hosted Operations`               | Safe installation, migration, backup, restore, and upgrade workflows            |
| `v0.3.0 — Intelligence & Marketplace Expansion` | Local analytics, operational visibility, and another marketplace adapter        |
| `v1.0.0 — Production Readiness & AdSense`       | Production release gates and optional, privacy-reviewed public-page advertising |
| `v1.1.0 — Optional Local Buy Assist`            | Local browser-assisted checkout and guarded experimental auto-buy               |

The detailed product sequence is maintained in [docs/11-roadmap.md](docs/11-roadmap.md).

## Workflow

Project items move through:

`Todo` → `In Progress` → `Done`

Use the Project fields consistently:

- **Priority:** Critical, High, Medium, or Low
- **Area:** Tracking, Marketplace, Self-hosting, Operations, AdSense, Buy Assist, Security, or Quality
- **Risk:** Normal, External policy, Security, or Financial
- **Milestone:** the release outcome that the issue advances

An issue is ready for implementation when its desired outcome and acceptance criteria are clear, dependencies are identified, and any data, security, financial, or marketplace-policy risk is called out.

## Definition of done

Work is complete when:

- Acceptance criteria are satisfied.
- Relevant automated and manual tests pass.
- User-facing, operational, API, and configuration documentation is updated.
- Database migrations are explicit, reviewed, and recoverable.
- New data and outbound connections follow the ownership requirements.
- Containerized installation and upgrade paths remain valid.
- No secrets or sensitive marketplace/session data are introduced.

## Key references

- [Vision](docs/01-vision.md)
- [Architecture](docs/02-architecture.md)
- [Business Logic](docs/05-business-logic.md)
- [API Contract](docs/06-api/openapi.yaml)
- [Purchase Assist](docs/12-purchase-assist.md)
- [Security Policy](SECURITY.md)
- [Release Guide](docs/14-releasing.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Open issues](https://github.com/SamsterZero/Prizen/issues)
