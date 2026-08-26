# NikaS specialized-panel compliance — LIDER

**Audit date:** 2026-08-26  
**Standard:** NikaS Specialized Panel UI Standard v1.6  
**Audited production path:** `custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js`

## v1.6 adoption

| Requirement | Result | Evidence / follow-up |
|---|---|---|
| One Work Viewport and native 100% scroll | PASS | One fixed `.viewport` owns vertical scroll; canvas origin is normalized at 100%. |
| Stationary Header and Bottom Tab Bar | PASS | Header and tabs use fixed edge attachment outside the viewport and transform. Final iPhone boundary-pull acceptance remains required. |
| UPS Header geometry and HA menu | PASS | Matching 44×44 plaques, 25px `ha-icon`, centered title and bubbling/composed `hass-toggle-menu`. |
| Pinch/reset/bounds | PASS | 75–200%, focal pinch, 97–103% snap, two-finger reset toast and factual edge clamp. |
| Stable DOM and live patching | PASS | Shell mounts once; telemetry/status patch existing nodes. `scripts/check-stable-dom.mjs` guards against structural redraw regression. |
| Optional indicator decision | ENABLED | Explicit project requirement for LIDER. Primary labels are `Локально / Нет связи / Нет данных`; freshness is independent. |
| LIDER status-colored surface | PASS | Primary color controls main text/lamp, approximately 8–12% tinted background and approximately 30% border. |
| Indicator typography | PASS | Primary 15px/700; secondary 12px/550. |
| General typography reference | PASS | Runtime provides the reference 9–25px scale; 9–11px is confined to schematic annotations. |
| Repository/integration identity | PASS | Packaged `custom_components/lider_voltage_control/brand/icon.png` is present; README uses the project identity. |

## Local indicator policy

- Current connection path is reported as `Локально` only after the authoritative online entity confirms the local meter.
- Failed connection displays `Нет связи`; indeterminate source displays `Нет данных`.
- Failed current polling immediately marks preserved values `Данные устарели`.
- Unchanged polls and telemetry-age checks patch the indicator only when the semantic category changes.
- `Онлайн` is not used.

## Remaining field acceptance

- Verify fixed Header/Bottom Tab coordinates during upward/downward iOS scroll and boundary pull.
- Verify several polling cycles during inertia without flicker, image reload or scroll jump.
- Verify two-finger reset does not open history/more-info.
- Verify short and long tabs keep final content above Bottom Tab Bar.
