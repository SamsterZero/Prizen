# Releasing Prizen

Prizen releases are immutable source tags, GitHub Releases, and container images published to GitHub Container Registry. Publishing artifacts does not create a hosted Prizen service; installations remain owner-controlled and self-hosted.

## Versioning

Use semantic versions:

- Patch (`v1.0.1`) for backward-compatible fixes
- Minor (`v1.1.0`) for backward-compatible features
- Major (`v2.0.0`) for breaking application, API, configuration, or migration changes

Pre-release tags such as `v1.0.0-rc.1` may be used for release candidates but are not tagged as `latest`.

## Release checklist

1. Confirm the target milestone is complete.
2. Update [CHANGELOG.md](../CHANGELOG.md), moving relevant entries out of `Unreleased`.
3. Confirm migrations are explicit, reviewed, backward compatible, and recoverable.
4. Verify backup, upgrade, rollback, and container health procedures.
5. Confirm CI passes on the release commit.
6. Create and push an annotated semantic-version tag:

   ```sh
   git tag -a v1.0.0 -m "Prizen v1.0.0"
   git push origin v1.0.0
   ```

7. Verify the GitHub Release, GHCR image tags, SBOM, and provenance attestation.
8. Test a fresh self-hosted installation using the published image before announcing the release.

## Published image

The release workflow publishes:

```text
ghcr.io/samsterzero/prizen:<version>
ghcr.io/samsterzero/prizen:<major>.<minor>
ghcr.io/samsterzero/prizen:latest
```

The `latest` tag is published only for stable versions.

Verify provenance with GitHub CLI:

```sh
gh attestation verify oci://ghcr.io/samsterzero/prizen:1.0.0 --repo SamsterZero/Prizen
```

## Rollback

Container tags are immutable release references. Roll back by restoring a compatible database backup and deploying the previous full semantic-version image. Never assume an irreversible database migration can be rolled back by changing only the container tag.
