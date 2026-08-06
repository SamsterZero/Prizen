# Workflows

## Track a product

```mermaid
sequenceDiagram
  participant U as User
  participant UI as SvelteKit UI
  participant P as Product module
  participant M as Marketplace adapter
  participant T as Tracker
  U->>UI: Paste product URL and target
  UI->>P: Create tracking request
  P->>M: Validate and fetch metadata
  P-->>UI: Accepted
  P->>T: Queue first scan
  T->>M: Fetch price
  T->>T: Persist observation and evaluate events
```

## Alert a user

The tracker detects a qualifying event, creates a deduplication key, and hands a sanitized alert to every verified channel. Each delivery gets an audit log. Retries occur independently per provider.

## Pause and resume

Pausing a watchlist item excludes it from user-driven tracking schedules and alerts without deleting price history. Resuming queues a scan and retains the target price.
