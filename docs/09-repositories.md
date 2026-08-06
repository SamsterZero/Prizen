# Repository Structure

```text
src/
  lib/
    modules/              # Domain contracts and feature slices
    server/db/            # Drizzle schema and database client
  routes/                 # SvelteKit UI and HTTP endpoints
docs/                     # Product and engineering specifications
```

Feature code belongs under its module, not a global services folder. Route handlers compose module use cases. An adapter may depend on an external API; domain logic may not. Import another module only through its public contract.

Tests mirror the source hierarchy. Unit tests cover price rules and adapter parsing; integration tests cover repository behavior and HTTP contracts; end-to-end tests cover tracking and alert workflows.
