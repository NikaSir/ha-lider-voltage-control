# Changelog

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
