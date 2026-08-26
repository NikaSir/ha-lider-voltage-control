# Changelog

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
