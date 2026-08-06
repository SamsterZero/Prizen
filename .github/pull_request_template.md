## Summary

<!-- Explain what changed and why. Keep this focused on reviewer-relevant context. -->

## Related issue

Closes #

## Validation

<!-- List the commands and manual checks you ran. Delete checks that do not apply. -->

- [ ] `bun run check`
- [ ] `bun test`
- [ ] `bun run lint`
- [ ] `bun run build`
- [ ] Relevant browser or container workflow tested

## Operational and data impact

- Database migration: <!-- None, or describe upgrade/rollback -->
- Configuration change: <!-- None, or list new/changed variables -->
- New stored data: <!-- None, or describe storage/export/deletion -->
- New outbound connection: <!-- None, or name the endpoint, purpose, and opt-out -->

<!-- Prizen must remain containerized, self-hosted, and independent of a Prizen-operated cloud service. -->

## Screenshots

<!-- For visible changes, add before/after images or a short recording. Otherwise, delete this section. -->

## Checklist

- [ ] The change is focused and contains no secrets or unrelated files
- [ ] Tests cover new behavior or the PR explains why none are needed
- [ ] Documentation and `.env.example` are updated when behavior or configuration changes
- [ ] Migrations are reviewed SQL and do not use `db:push` for production
- [ ] External services are optional, transparent, and disabled by default where appropriate
