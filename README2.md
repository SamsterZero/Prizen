# 🛒 Prizen

> Never miss the best deal again.

Prizen is an intelligent product price tracking platform that monitors products across online marketplaces and notifies users when prices drop to their desired value or reach a historical low.

The application is designed as a **Modular Monolith (Modulith)**, allowing rapid development today while enabling seamless extraction of modules into independent microservices as the platform grows.

---

## ✨ Features

### Current

- Track products from supported marketplaces
- Historical price tracking
- Price trend visualization
- Discord notifications
- Telegram notifications
- Product watchlists
- Redis-powered caching
- Scheduled price monitoring

### Planned

- User authentication
- Multiple marketplace support
- Lowest price prediction
- Browser extension
- AI-powered deal recommendations
- Auto checkout (optional)
- Purchase automation (user-authorized)
- Subscription plans
- Mobile application

---

# Project Goals

Prizen aims to provide a reliable and extensible platform for monitoring product prices while remaining developer-friendly and easy to maintain.

The project follows several guiding principles:

- Modular architecture
- Domain-driven design
- API-first development
- Documentation-first development
- AI-assisted software engineering
- Testable business logic
- Future-ready microservice boundaries

---

# Architecture

The project follows a **Modular Monolith** architecture.

```text
                +----------------------+
                |     SvelteKit UI     |
                +----------+-----------+
                           |
                    Internal API
                           |
    +---------------------------------------------------+
    |                 Application Core                  |
    |---------------------------------------------------|
    | Product Module                                    |
    | Marketplace Module                                |
    | Price Tracker Module                              |
    | Notification Module                               |
    | User Module                                       |
    | Watchlist Module                                  |
    | Scheduler Module                                  |
    | Analytics Module                                  |
    | Checkout Module (Future)                          |
    +---------------------------------------------------+
               |                         |
        PostgreSQL                 Redis Cache
```

More details can be found in:

- `docs/02-architecture.md`

---

# Technology Stack

## Frontend

- SvelteKit
- TypeScript
- Tailwind CSS
- shadcn-svelte

## Backend

- SvelteKit Server
- TypeScript
- Drizzle ORM

## Database

- PostgreSQL

## Cache

- Redis

## Infrastructure

- Docker
- Docker Compose

## Notifications

- Discord
- Telegram

---

# Project Structure

```
price-sentinel/

docs/
src/
drizzle/
static/

.github/

.ai/

package.json
README.md
```

---

# Documentation

| Document             | Description               |
| -------------------- | ------------------------- |
| 01-vision.md         | Project goals and scope   |
| 02-architecture.md   | High-level architecture   |
| 03-modules.md        | Modulith design           |
| 04-database.md       | Database design           |
| 05-business-logic.md | Domain rules              |
| 06-api/openapi.yaml  | API specification         |
| 07-workflows.md      | User and system workflows |
| 08-theme.md          | UI/UX specification       |
| 09-repositories.md   | Repository structure      |
| 10-ai-development.md | AI-assisted development   |
| 11-roadmap.md        | Future roadmap            |

---

# Development Principles

Every feature follows the same lifecycle:

```
Idea
    ↓
Architecture
    ↓
Specification
    ↓
GitHub Issue
    ↓
Implementation
    ↓
Testing
    ↓
Documentation
    ↓
Merge
```

No implementation should exist without documentation.

---

# AI-Assisted Development

This repository is designed to work alongside AI development tools.

The AI is responsible for assisting with:

- Feature planning
- Architecture decisions
- Documentation updates
- GitHub issue management
- Milestone creation
- Pull request generation
- Code reviews
- Testing
- Refactoring

AI guidance can be found in:

```
docs/10-ai-development.md
```

---

# Future Vision

Prizen is intentionally designed to evolve beyond a traditional price tracker.

Future capabilities include:

- Marketplace abstraction
- Purchase automation
- AI shopping assistant
- Deal prediction
- Personalized recommendations
- Multi-market comparison
- Browser integrations
- Mobile applications

---

# License

License to be determined.

---

# Status

🚧 Under Active Development

The project is currently in the architecture and specification phase.
Implementation will begin after all core specifications have been finalized.
