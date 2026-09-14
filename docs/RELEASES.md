# Update and release policy

## Current repository state

- `main` is the canonical source branch, and accepted changes reach it through reviewed pull requests after required checks pass.
- The integration manifest is the version source of truth; panel metadata identifies the UI version.
- At the 2026-09-14 audit baseline, this repository had no Git tags or GitHub Releases. Existing documentation described updates from `main` through a custom HACS repository.
- End-to-end acceptance that HACS exposes and installs the current `main` state was not performed by that audit. A merged commit is accepted source, not confirmed user delivery, until verification succeeds in the target Home Assistant installation.

## Approved publication model

The approved target is **beta → user verification → stable**:

1. Merge a reviewed candidate to `main` only after repository checks, HACS validation and Hassfest pass.
2. Publish a beta from that exact commit, with the version derived from `custom_components/lider_voltage_control/manifest.json` rather than invented by automation.
3. Refresh the custom repository in HACS, install the beta, restart Home Assistant when required, and complete user verification on the real installation.
4. Verify phase loss and recovery, stale-data behavior, the Recorder views, refresh feedback, mobile geometry, navigation and the installed bundle.
5. After acceptance, prepare the stable version in a reviewed PR, rerun its required checks, and publish a matching stable tag. Keep previous published releases immutable and available for rollback.

The first approved beta has now been published; see the verified snapshot below. Automatic publication is not introduced by this documentation update.

## Rollback

Until the first stable release under the target model exists, rollback uses the previously accepted commit and the operator's Home Assistant backup. After adoption, the preceding stable release remains available and must not be deleted or retargeted.

The repository-specific target above is an approved exception to blanket no-Releases wording in vendored shared standards. Those shared documents must be reconciled at their central authority before their pinned copies are updated here.

## Verified beta delivery snapshot — 2026-09-14

- Published GitHub prerelease: [`0.8.12-b1`](https://github.com/NikaSir/ha-lider-voltage-control/releases/tag/0.8.12-b1).
- Source commit: `c9c9a01b7efe0bbbe458b47a0e791aeb60b2c70d`.
- The tag matches the integration manifest version.
- HACS and Hassfest checks on this exact commit completed successfully.
- Delivery uses the standard GitHub source archive. `hacs.json` does not require a separately uploaded ZIP asset.
- **Target Home Assistant installation and device acceptance remain unverified.** A published beta and green CI are not evidence of a successful installed update.

## Beta acceptance in Home Assistant

1. Open this custom Integration repository in HACS and enable beta/prerelease versions in its version selection.
2. Confirm the selected version is `0.8.12-b1`, install it, and restart Home Assistant as required.
3. Confirm the loaded integration version and panel UI version against the selected release; reopen the panel from a cold client/cache.
4. Verify the fixed header and bottom menu, device selectors, black Refresh button and completion feedback, scrolling, pinch zoom and reset. Verify telemetry updates without a full panel redraw.
5. Record the installed version, Home Assistant/HACS versions, device/client, checks performed and any errors. Do not mark acceptance complete without this evidence.
6. Publish stable only after user acceptance and version-consistent checks. Preserve existing published beta/stable tags and releases; use a new reviewed version for corrections.

This repository-specific beta policy reflects the approved publication decision and takes precedence over older blanket no-Releases wording in shared documentation. Shared pinned standards are not modified here.
