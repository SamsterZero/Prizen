# Repository Structure

```text
CONTRIBUTING.md           # Contributor setup, validation, and review expectations
CODE_OF_CONDUCT.md        # Community participation and enforcement expectations
CHANGELOG.md              # Notable changes grouped by release
LICENSE                   # Apache License 2.0
PROJECT.md                # Planning workflow, milestones, and definition of done
README.md                 # Product overview and installation entrypoint
SECURITY.md               # Private vulnerability reporting and support policy
src/
  lib/
    modules/              # Domain contracts and feature slices
    server/db/            # Drizzle schema and database client
  routes/                 # SvelteKit UI and HTTP endpoints
docs/                     # Product and engineering specifications
.github/                  # Ownership rules and issue/pull-request templates
```

Feature code belongs under its module, not a global services folder. Route handlers compose module use cases. An adapter may depend on an external API; domain logic may not. Import another module only through its public contract.

Tests mirror the source hierarchy. Unit tests cover price rules and adapter parsing; integration tests cover repository behavior and HTTP contracts; end-to-end tests cover tracking and alert workflows.

Actionable work belongs in [GitHub issues](https://github.com/SamsterZero/Prizen/issues) and the [Prizen Roadmap](https://github.com/users/SamsterZero/projects/4). Product decisions and durable engineering constraints belong in `docs/`; an issue or Project field is not a substitute for updating the relevant specification.
