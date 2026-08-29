# LIDER compliance with NikaS UI v1.9 / Navigation Contract v1.1 / rule 1.17

Version under review: integration/UI `0.8.3`.

| Requirement | Status | Evidence |
| --- | --- | --- |
| One persistent Header, work viewport and Bottom Tab Bar | PASS | Shell is mounted once; CI rejects additional `shadowRoot.innerHTML` assignments. |
| Height-locked phone shell | PASS | A fixed host owns one three-row grid; only the middle viewport scrolls and scroll chaining into the outer HA document is disabled. CI rejects the former `100dvh`/independent-fixed-layer topology. |
| Stable telemetry rendering | PASS | `set hass()` coalesces updates to one animation frame and reconciles the active view only. |
| Lazy visited-view DOM cache | PASS | Returning to a tab reattaches its existing subtree, including the overview image and history cards. |
| Connection/freshness indicator | PASS | Independent `Локально / Нет связи / Нет данных` and freshness categories; category-only patching. |
| Gesture safety | PASS | Pinch waits for both fingers to lift and suppresses the following synthetic click. |
| Zoom bounds and 100% native scroll | PASS | 75–200%, axis-aware clamping, 100% origin normalization and two-finger reset. |
| Bottom navigation | PASS | Five equal destinations, 28 px MDI icons and 12 px labels remain in the fixed shell row outside the work viewport. |
| Panel and HA menu name | PASS | The Header and registered sidebar title use the approved `Электросеть`; LIDER remains the equipment/integration identity. |
| Mobile overview labels | PASS | At phone widths, full `Мощность` and `Напряжение` labels occupy separate compact rows; typography remains 12 px. |
| Overview height fit | PASS | Overview uses the exact work-viewport height: its installation scene absorbs the available remainder above the line card, and 100% scale exposes no residual vertical scroll. Other long tabs keep native work-area scrolling. |
| Operational units | PASS | Latin `V/A/W/Hz` metadata is presented as `В/А/Вт/Гц`; raw diagnostics retain source metadata. |
| Typography | PASS | Automated guard enforces the 12–25 px meaningful-text envelope. |
| Header return | PASS | Captured safe route is persisted and navigation is explicit; `history.back()` is rejected. |
| Header explicit-route precedence | PASS | The first valid route is selected from `return_to`, then `from`; an invalid first parameter cannot suppress the second. |
| Header focus and pressed states | PASS | The centered semantic button has persistent `:focus-visible` and `:active` treatments. |
| Strict source hand-off | PASS | Route and timestamp are required together and invalid, stale or future hand-offs fail closed before saved/referrer/configured fallbacks. |
| Data truth and command policy | PASS | The panel is read-only; fixed verified contract points and registry-discovered related entities never fabricate missing values, related IDs or healthy states. |
| Initial loading surface | PASS | Fixed Header, deterministic loading skeleton and Bottom Tab Bar mount before the first `hass` update; no blank startup canvas. |
| Diagnostics completeness | PASS | All enabled state-bearing entities of the bound devices, raw attributes, timestamps and context. |
| Autonomous frontend delivery | PASS | Deterministic self-contained production bundle with no runtime imports. |
| Statistics grouping | PASS | `До стабилизаторов`, `После стабилизаторов`, then the non-interruptible line; generation/export excluded. History uses authenticated Recorder REST data and autonomous SVG rather than unavailable Lovelace-only helpers. |
| Statistics request lifecycle | PASS | Each period owns one cached load; graphs are requested with concurrency 2, telemetry and period switching cannot duplicate it, each graph has a 60-second terminal timeout, and Header refresh explicitly replaces only the active load. |
| Repository checks | PASS | Local syntax, version parity, bundle, contract and stable-DOM checks pass; the publication PR must repeat them. |
| HACS/Hassfest | PENDING | Must pass on the publication PR and merge commit. |
| iPhone Pro Max portrait shell acceptance | PASS | User accepted v0.8.0 on a real phone: fixed chrome, native/inertial work scrolling, short views, ten tab switches, pinch/reset and telemetry updates all passed without movement, white frames or flicker. |
| Recorder history phone acceptance | GAP | v0.8.3 must confirm `24h → 7d → 24h → 7d` on the target phone: completed graphs appear progressively, returning to a period does not restart it, and every graph reaches data/no-records/Recorder-unavailable without indefinite loading. |

The remaining phone GAP is limited to the new Recorder graph path. The fixed shell and interaction baseline do not require repeat redesign; regression acceptance still checks that opening and changing history periods leaves Header, Bottom Tab Bar, zoom and telemetry updates stable.
