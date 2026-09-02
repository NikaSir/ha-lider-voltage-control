# Changelog

## 0.8.4

- Prefixes the Home Assistant and HACS integration name with `NikaS`.
- Republishes the approved local LIDER brand icon while retaining panel UI 0.8.3.
- Verifies the integration package and retained panel UI versions independently in CI.

## 0.8.3

- Splits each statistics period into independent per-graph Recorder requests so one oversized response cannot block every chart.
- Limits Recorder work to two concurrent graph requests and renders completed graphs progressively.
- Reuses both in-flight and completed period loads, preventing `24h → 7d → 24h → 7d` navigation from duplicating expensive queries.
- Raises the terminal timeout to 60 seconds for each smaller graph request; a failed graph remains explicit without hiding successful graphs.
- Makes Header refresh the only action that discards and reloads the cached active period.

## 0.8.2

- Prevents telemetry updates from starting overlapping Recorder history requests for the same period and invalidating every earlier response.
- Adds a 30-second terminal timeout so history cards cannot remain in `Загрузка истории…` indefinitely.
- Requests only significant state changes in addition to the existing minimal/no-attributes response, reducing Recorder payload and phone rendering work.
- Keeps an explicit refresh path for retrying the active statistics period without rebuilding the panel shell.

## 0.8.1

- Replaces the unavailable `window.loadCardHelpers()` dependency in the integration-owned custom panel with the supported authenticated `hass.callApi()` frontend method.
- Reads factual state history directly from Home Assistant Recorder for 24 hours, 7 days, 30 days and 12 months.
- Renders autonomous SVG charts for voltage, current and power while preserving the approved fixed shell and stable-DOM behavior.
- Limits only the number of plotted SVG points per series; available Recorder data, missing states and retention depth remain explicit and are never fabricated.
- Fits Overview exactly between the persistent Header and Bottom Tab Bar by assigning the installation scene the remaining height above the non-interruptible-line card; the short page no longer has a residual vertical scroll.
- Adds CI guards that reject a return to Lovelace card-helper coupling.

## 0.8.0

- Renames the Home Assistant sidebar entry and the persistent Header title to `Электросеть`; LIDER remains the integration and equipment identity.
- Locks the phone panel host to the visual viewport and composes Header, work viewport and Bottom Tab Bar as one three-row application grid.
- Makes the work viewport the only scrolling surface and blocks scroll chaining into Home Assistant, preventing iOS elastic scroll from pulling either fixed menu upward.
- Keeps the fixed chrome and short views at full shell height while preserving stable-DOM telemetry patches, cached tabs, safe areas and gesture-only zoom.
- Adds CI guards that reject `100dvh` and independently fixed Header, viewport or Bottom Tab Bar layers.

## 0.7.1

- Requires the one-shot source route and timestamp as a complete pair and rejects invalid, stale and future hand-offs before resolving the Header return route.
- Adopts NikaS Specialized Panel UI Standard v1.9, Navigation Contract v1.1 and explicit registry-backed, read-only data-truth metadata.
- Declares only the autonomous generated bundle as the production runtime and verifies deterministic source-to-bundle parity in CI.

## 0.7.0

- Rebuilt the integration-owned shell against mandatory NikaS UI Standard v1.7 / rule 1.17.
- Added a fixed Header and Bottom Tab Bar loading surface with deterministic skeleton content before the first Home Assistant state object arrives; blank startup frames are prohibited.
- Kept `unknown`, `unavailable` and absent entities explicit as `Нет данных` without inventing zero or healthy values.
- Stopped constructing unverified post-LIDER current/power entity IDs; related metrics and history cards are created only from live state or Entity Registry evidence.
- Fixed explicit return-route precedence so an invalid `return_to` cannot suppress a valid `from` route.
- Added the canonical visible focus and pressed states to the centered two-line Header return plaque.
- Raised the integration, UI contract and copied template version together and retained one autonomous production bundle.
- Added a canonical-standard checksum and CI guard for source-route, Header and production-entrypoint compliance.

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
