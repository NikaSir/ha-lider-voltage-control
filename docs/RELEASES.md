# Update and release policy

## Current repository state

- `main` is the canonical source branch, and accepted changes reach it through reviewed pull requests after required checks pass.
- The current integration version is [`0.8.11`](../custom_components/lider_voltage_control/manifest.json); the current UI version is `0.8.10`.
- At the 2026-09-14 audit baseline, this repository had no Git tags or GitHub Releases. Existing documentation described updates from `main` through a custom HACS repository.
- End-to-end acceptance that HACS exposes and installs the current `main` state was not performed by that audit. A merged commit is accepted source, not confirmed user delivery, until verification succeeds in the target Home Assistant installation.

## Approved future publication target

The approved target is **beta → user verification → stable**:

1. Merge a reviewed candidate to `main` only after repository checks, HACS validation and Hassfest pass.
2. Publish a beta from that exact commit, with the version derived from `custom_components/lider_voltage_control/manifest.json` rather than invented by automation.
3. Refresh the custom repository in HACS, install the beta, restart Home Assistant when required, and complete user verification on the real installation.
4. Verify phase loss and recovery, stale-data behavior, the Recorder views, refresh feedback, mobile geometry, navigation and the installed bundle.
5. Promote only that verified commit and version to stable. Keep the preceding stable release immutable and available as the rollback target.

This is a publication target, not evidence that a beta or stable Release already exists. Publication automation, tags and Releases are outside this maintenance change.

## Rollback

Until the first stable release under the target model exists, rollback uses the previously accepted commit and the operator's Home Assistant backup. After adoption, the preceding stable release remains available and must not be deleted or retargeted.

The repository-specific target above is an approved exception to blanket no-Releases wording in vendored shared standards. Those shared documents must be reconciled at their central authority before their pinned copies are updated here.
