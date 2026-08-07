# Releasing Prizen

Prizen releases are immutable source tags, GitHub Releases, and container images published to GitHub Container Registry. Publishing artifacts does not create a hosted Prizen service; installations remain owner-controlled and self-hosted.

## Versioning

Use semantic versions:

- Patch (`v1.0.1`) for backward-compatible fixes
- Minor (`v1.1.0`) for backward-compatible features
- Major (`v2.0.0`) for breaking application, API, configuration, or migration changes

Pre-release tags such as `v1.0.0-rc.1` may be used for release candidates but are not tagged as `latest`.
For milestone 2, publish `v0.2.0-rc.1` only after issue #6 is merged and CI passes. Promote to
`v0.2.0` after the published candidate passes the recovery procedure; fixes produce `-rc.2` and so on.

## Release checklist

1. Confirm the target milestone is complete.
2. Update [CHANGELOG.md](../CHANGELOG.md), moving relevant entries out of `Unreleased`.
3. Confirm migrations are explicit, reviewed, backward compatible, and recoverable.
4. Verify the [backup, upgrade, and rollback procedure](18-backup-restore-and-upgrades.md) and
   container health checks.
5. Confirm CI passes on the release commit.
6. Create and push an annotated semantic-version tag:

   ```sh
   git tag -a v1.0.0 -m "Prizen v1.0.0"
   git push origin v1.0.0
   ```

7. Verify the GitHub Release, lifecycle scripts, GHCR image and Compose application, SBOM, and
   provenance attestation.
8. Complete the [Tracking MVP release acceptance procedure](16-tracking-mvp-acceptance.md) using
   the published image before announcing the release.

## Published image

The release workflow publishes:

```text
ghcr.io/samsterzero/prizen:<version>
ghcr.io/samsterzero/prizen:<major>.<minor>
ghcr.io/samsterzero/prizen:latest
```

The `latest` tag is published only for stable versions.

The workflow also publishes `compose.release.yaml`, `backup-release.sh`, and `restore-release.sh` as
GitHub Release assets, plus an OCI Compose application at
`ghcr.io/samsterzero/prizen-stack:<version>`. The Compose application pins the Prizen image by
digest, generates persistent installation secrets on first start, runs migrations once, and then
starts the app and tracker.

Install with Docker Compose 2.34 or newer:

```sh
docker compose -f oci://ghcr.io/samsterzero/prizen-stack:1.0.0 up -d --wait
```

Podman users should download the release's `compose.release.yaml` asset and run
`podman compose -f compose.release.yaml up -d`. Back up both named volumes before upgrading.

Verify provenance with GitHub CLI:

```sh
gh attestation verify oci://ghcr.io/samsterzero/prizen:1.0.0 --repo SamsterZero/Prizen
```

## Rollback

Container tags are immutable release references. Roll back by restoring a compatible database backup and deploying the previous full semantic-version image. Never assume an irreversible database migration can be rolled back by changing only the container tag.
