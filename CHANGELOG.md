# Changelog

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
