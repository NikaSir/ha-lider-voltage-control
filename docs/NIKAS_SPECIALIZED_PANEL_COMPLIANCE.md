# LIDER specialized-panel compliance audit

**Standard:** NikaS Specialized Panel UI Standard v1.6
**Runtime:** `lider-voltage-control-panel.js` / UI `0.4.5`
**Integration:** `lider_voltage_control` `0.4.5`

## Result

| Requirement | Result | Evidence |
|---|---|---|
| Fixed native shell | PASS | Header, one canvas viewport and full-width safe-area Bottom Tab Bar are separate persistent shell rows. |
| Home Assistant menu | PASS | Permanent left `mdi:menu` dispatches bubbling/composed `hass-toggle-menu`; Refresh is the matching right plaque. |
| UPS Header geometry | PASS | 52/1fr/52 grid, 48px narrow rails, 44×44 radius-16 actions, 25px MDI icons and 23/14px (21/13px narrow) title pair. |
| Bottom navigation | PASS | Full-width fixed bar, 28px `ha-icon` glyphs and 12px/700 labels; minimum target height exceeds the 52px baseline. |
| One zoom viewport | PASS | Exactly one work viewport/canvas; native vertical scroll and fixed transform origin at 100%, bounded overflow-axis pan above 100%, 75–200% pinch, 97–103% snap and stationary two-finger reset. |
| Gesture protection | PASS | Pinch, pan and two-finger tap cancel pending activation and briefly suppress synthetic click; intentional stationary more-info remains available. |
| Stable rendering | PASS | Shell mounts once. Telemetry and the 15-second freshness check patch existing text/classes/attributes; background, viewport, scroll and navigation are not reconstructed. |
| Requested two-level indicator | PASS | Explicitly enabled. Transport is `Локально / Нет связи / Нет данных`; freshness is independent. Main status colour drives dot, 16px main text, 8–12% background tint and approximately 30% border; freshness is 13px. |
| Typography | PASS | Meaningful copy is 12–25px. Compact scene annotations are raised to 12px by the final v1.6 override. |
| Electrical thresholds | PASS | Incoming voltage uses the LIDER PS7500W-15 passport bands before stabilizers; confirmed downstream points use the separate project ГОСТ quality bands. |
| Repository and integration identity | PASS | README uses the approved LIDER identity and packaged `custom_components/lider_voltage_control/brand/icon.png` is validated. |
| Autonomous delivery and CI | PASS | One stable integration-owned module; contract, stable-DOM, brand and syntax checks are repository-owned. GitHub Releases and automatic release tags are not used. |
| Real iPhone acceptance | GAP | Companion App validation remains required for safe area, long scroll, focal pinch, bounded pan/reset, more-info and absence of flashing during live updates. |

The `GAP` is external field acceptance only; it is not represented as an automated PASS.
