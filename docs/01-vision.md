# Vision

> Building the smartest self-hosted tool for tracking prices, discovering deals, and assisting purchases.

---

# Overview

Prizen is a local-first price intelligence application that helps its owner make informed purchasing decisions by continuously monitoring products across supported online marketplaces.

Rather than checking prices manually, users can track products, receive real-time notifications when prices fall, analyze historical trends, and, in the future, authorize Prizen to automatically complete purchases when predefined conditions are met.

Prizen is permanently self-hosted. The installation owner controls the application, database, encryption keys, backups, and update schedule. Its **Modular Monolith (Modulith)** design keeps domain boundaries clear without requiring a hosted Prizen control plane.

---

# Mission

Enable users to purchase products at the best possible price through intelligent monitoring, historical analysis, timely notifications, and optional purchase automation.

---

# Vision Statement

To become the most trusted self-hosted product-price tool by combining reliable data collection, careful automation, user ownership, and a seamless experience.

---

# Core Principles

## Documentation First

Every feature begins with a specification before implementation.

---

## API First

Modules communicate through stable contracts that can later become external APIs.

---

## Modular by Design

Every domain is isolated with minimal coupling.

Modules may run as separate local processes when useful, but remain part of the owner's installation.

---

## AI Assisted Development

AI is treated as a development collaborator.

It assists with:

- Architecture
- Documentation
- Planning
- Testing
- GitHub management

Human developers remain responsible for all final decisions.

---

## Marketplace Agnostic

Prizen is not built specifically for Amazon.

Amazon is simply the first supported marketplace.

Future marketplaces may include:

- Flipkart
- Croma
- Reliance Digital
- Myntra
- Ajio
- Best Buy
- Walmart
- eBay

---

## User-Owned by Design

- Prizen has no required cloud account or central control plane.
- PostgreSQL data and container volumes belong to the installation owner.
- Telemetry is off by default and requires an explicit opt-in.
- Marketplace sessions and payment instruments stay with the marketplace and the owner's browser.
- Export, backup, restore, and deletion must remain possible without contacting a Prizen service.

---

# Objectives

## MVP

- Track products
- Store historical prices
- View price history
- Discord notifications
- Telegram notifications
- User watchlists
- Scheduled tracking

---

## Version 1

- Multiple marketplaces
- Dashboard
- Analytics
- Product search
- Advanced filtering
- Browser extension

---

## Long-Term

- Purchase automation
- AI shopping assistant
- Personalized recommendations
- Mobile applications
- Local API
- Backup and restore tools

---

# Success Metrics

Prizen should strive to achieve:

- Accurate price tracking
- Reliable notifications
- Minimal duplicate data
- Fast dashboard performance
- High module independence
- Maintainable architecture
- Comprehensive documentation

---

# Non-Goals

The initial versions of Prizen will **not** include:

- Marketplace hosting
- Inventory management
- Payment processing
- Product reviews
- Affiliate marketplace replacement
- Social shopping features
- Hosted Prizen accounts
- Cloud synchronization
- Mandatory telemetry
- Subscription or licensing servers

These self-hosting and ownership boundaries are permanent and are not future roadmap candidates.

---

# Target Users

## Casual Shoppers

Track products and receive price alerts.

---

## Power Users

Maintain large watchlists and analyze historical pricing.

---

## Enthusiasts

Monitor hardware, gaming, and electronics deals across multiple marketplaces.

---

## Developers

Contribute to an open, well-documented, modular codebase licensed under the Apache License 2.0.

---

# Design Philosophy

Prizen values:

- Simplicity over unnecessary complexity
- Reliability over rapid feature expansion
- Documentation over tribal knowledge
- Explicit architecture over hidden assumptions
- Long-term maintainability over short-term convenience

---

# Guiding Philosophy

A product should not simply notify users about today's price.

It should help them answer:

- Is this a good deal?
- Has the price been lower before?
- Should I wait?
- Which marketplace currently offers the best value?
- Can Prizen purchase it automatically when my target price is reached?

Prizen aims to become an intelligent purchasing companion rather than just another price tracker.

---

# Road Ahead

The implementation of Prizen will follow this sequence:

1. Architecture
2. Module Design
3. Database Design
4. Business Logic
5. API Specification
6. User Interface
7. Implementation
8. Testing
9. Deployment

No implementation should begin before the relevant specifications are completed.
