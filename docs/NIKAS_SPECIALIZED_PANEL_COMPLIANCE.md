# LIDER compliance with NikaS UI v1.9 / Navigation Contract v1.1 / rule 1.17

Version under review: integration/UI `0.7.1`.

| Requirement | Status | Evidence |
| --- | --- | --- |
| One persistent Header, work viewport and Bottom Tab Bar | PASS | Shell is mounted once; CI rejects additional `shadowRoot.innerHTML` assignments. |
| Stable telemetry rendering | PASS | `set hass()` coalesces updates to one animation frame and reconciles the active view only. |
| Lazy visited-view DOM cache | PASS | Returning to a tab reattaches its existing subtree, including the overview image and history cards. |
| Connection/freshness indicator | PASS | Independent `Локально / Нет связи / Нет данных` and freshness categories; category-only patching. |
| Gesture safety | PASS | Pinch waits for both fingers to lift and suppresses the following synthetic click. |
| Zoom bounds and 100% native scroll | PASS | 75–200%, axis-aware clamping, 100% origin normalization and two-finger reset. |
| Bottom navigation | PASS | Five equal destinations, 28 px MDI icons, 12 px labels, fixed outside the viewport. |
| Mobile overview labels | PASS | At phone widths, full `Мощность` and `Напряжение` labels occupy separate compact rows; typography remains 12 px. |
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
| Statistics grouping | PASS | `До стабилизаторов`, `После стабилизаторов`, then the non-interruptible line; generation/export excluded. |
| Repository checks | PASS | Local syntax, version parity, bundle, contract and stable-DOM checks pass; the publication PR must repeat them. |
| HACS/Hassfest | PENDING | Must pass on the publication PR and merge commit. |
| iPhone Pro Max portrait acceptance | GAP | Requires installation from `main` through HACS and the user's real-phone check. |

The phone GAP is intentionally not marked as passed by static analysis. Acceptance should include ten consecutive tab switches, pinch/pan/reset, long diagnostics scrolling, repeated telemetry updates, loss/recovery, Header return and confirmation that fixed chrome never flashes or moves.
