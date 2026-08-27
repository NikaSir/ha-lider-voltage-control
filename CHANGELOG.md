# Changelog

## 0.6.1

- Reflowed each mobile input phase card into separate compact power and voltage rows without reducing 12 px text.
- Center-aligned the input and output cards with the three physical LIDER modules and reduced unused output-card padding.
- Localized operational `V`, `A`, `W` and `Hz` units to `В`, `А`, `Вт` and `Гц` while preserving raw Home Assistant metadata in Diagnostics.
- Shortened the overview flow caption to `Сеть → LIDER → дом` and kept it on one line at phone widths.
- Pointed the `После` icon along the left-to-right electrical flow.
- Replaced the clipped visible `Диагностика` label with `Диагн.` while retaining the full accessible name.
- Added CI markers and dynamic checks for the responsive overview layout, localized units and accessible navigation.

## 0.6.0

- Replaced the six compressed destinations with five standard bottom tabs; the non-interruptible line remains on Overview, Statistics and Diagnostics.
- Restored 28 px bottom icons, 12 px labels and the 12–25 px meaningful-text envelope.
- Added lazy DOM caching so returning to a visited tab reattaches the same subtree, overview image and history cards.
- Coalesced Home Assistant updates to one animation frame and made cold Entity Registry completion reconcile changing child topology safely.
- Suppressed synthetic clicks after pinch/pan and wait for every touch to end, preventing gesture-triggered More Info/history opens.
- Persisted and reused the captured Header return route while retaining explicit Home Assistant navigation.
- Expanded raw diagnostics to all enabled state-bearing entities of bound devices, excluding command-only domains.
- Made known alarm severities outrank an unavailable phase in group summaries.
- Replaced runtime version imports with one deterministic, self-contained production frontend bundle.
- Added CI guards for bundle parity, five-tab geometry, typography, route persistence, gesture safety and stable rendering.

## 0.5.1

- Kept all six then-current destinations in one compact row with reduced 24 px icons and mobile labels.
- This temporary compact geometry is superseded by the five-tab v0.6.0 layout.

## 0.5.0

- Added a dedicated `Диагностика` tab that groups every Home Assistant entity used by the input meter, three post-LIDER phase sources and the non-interruptible-line UPS.
- Diagnostics now expose the raw entity `state`, every available attribute, state timestamps and Home Assistant context without filtering service or energy fields.
- Converted the centered Header title into a 44 px+ clickable two-line return pill: `LIDER` / `UI v0.5.0`.
- Added explicit safe return routing to `Дом сейчас`, `Действия` or `Инфраструктура` without `history.back()`; direct LIDER opens fall back to `/dashboard-infrastructure/overview`.
- Preserved the stable Header, zoom viewport, scroll state and Bottom Tab Bar during telemetry and diagnostics updates.
- Added CI checks for the diagnostics tab, explicit return-route contract and the ban on `history.back()`.
- Updated the local NikaS specialized-panel standard snapshot to v1.6.

## 0.4.4

- Replaced telemetry-driven canvas reconstruction with point updates of existing DOM nodes.
- Limited the connection/freshness badge update to actual category transitions.
- Preserved the equipment image, zoom viewport, scroll position, Header and Bottom Tab Bar across every Home Assistant state update.
- Removed structural rendering from the freshness timer and registry completion path.
- Added the stable-DOM and anti-flicker requirements to the shared specialized-panel standard.

## 0.4.3

- Switched the statistics tab from long-term statistics to ordinary Home Assistant recorder history, so input sensors without statistics metadata are displayed.
- Grouped all voltage, current and power charts into `До стабилизаторов` and `После стабилизаторов` sections.
- Kept the non-interruptible line as a separate final history section.
- Retained all four periods; their availability now follows the configured Recorder retention.

## 0.4.2

- Extended the overview installation scene into the space previously occupied by the explanatory note.
- Removed the redundant Home Assistant history hint below the non-interruptible line.
- Lowered the equipment layer to create clear space below the two-level connection badge.
- Excluded generation, produced, export and reverse-energy entities from history and dynamic diagnostics.

## 0.4.1

- Replaced the single `Online`/`Offline` label with an independent two-level connection and telemetry-freshness badge.
- Connection now reports only `Локально`, `Нет связи` or `Нет данных`; cloud and reserve modes are intentionally excluded.
- Telemetry reports `Данные актуальны`, `Данные устарели` or `Нет данных` from the last successful state report.
- The stale threshold is three reported polling periods, with a 30-second default period and 90-second default threshold.
- Preserved the last successful numeric input snapshot when the current poll becomes unavailable.
- Added the 10 px status lamp, required spacing, typography and Home Assistant semantic theme colors.

## 0.4.0

- Rebuilt both input and output summaries as three equal phase columns.
- Each phase column now gives voltage, current and power equal visual weight.
- Removed the separate phase-power section and moved phase currents out of diagnostics.
- Removed the redundant `LIDER` eyebrow from input and output titles.
- Kept energy, frequency, imbalance, connectivity and other service values in diagnostics.
- Added the native Home Assistant `Статистика` tab for 24 hours, 7 days, 30 days and 12 months.
- History covers voltage, current and power before/after LIDER plus non-interruptible-line voltage.

## 0.3.3

- Compacted detail cards by reducing unused height, padding and section gaps without reducing font sizes.
- Kept phase voltages A/B/C in one row.
- Placed phase powers A/B/C and phase currents A/B/C in dedicated three-column rows.
- Kept long diagnostics in two columns for readable names, dates and values.

## 0.3.2

- Removed the redundant `ЭЛЕКТРОСЕТЬ` eyebrow from the overview scene.
- Kept `Стойка 9-36 · пофазный байпас` on one line.
- Added a green/red status lamp to the `Online`/`Offline` indicator.

## 0.3.1

- Shifted the equipment layer slightly right to clear the phase cards.
- Placed phase power left of input voltage in one compact metric row.
- Increased vertical separation between the three input cards.
- Compressed the scene heading and moved the equipment caption away from the rack.

## 0.3.0

- Header and Bottom Tab Bar aligned with the shared Stark SolarPower shell.
- Header actions use equal 44 px cards and 25 px MDI icons.
- Refresh action uses the Home Assistant primary color.
- Bottom navigation uses full-width 58 px buttons and 28 px MDI icons.
- Overview phase cards are split into input/power on the left and output voltage on the right of each stabilizer.
- Constrained zoom, native 100% vertical scrolling and safe-area handling retained.
- Repository checks now verify the sidebar icon, integration brand icon and shell dimensions.
## 0.6.1

- Enforce NikaS UI Standard v1.7 title-plaque return to the originating base panel and validate the shared route handoff in CI.
