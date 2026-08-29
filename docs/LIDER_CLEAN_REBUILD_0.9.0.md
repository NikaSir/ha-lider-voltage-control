# LIDER UI 0.9.0 — clean rebuild

## Purpose

Version 0.9.0 is an architectural rewrite of the integration-owned `Электросеть` panel. The previous frontend is not used as the implementation base. Only verified entity mappings, accepted artwork, factual thresholds and proven behavior are retained.

Normative inputs:

- NikaS Specialized Panel UI Standard v1.9;
- NikaS Panel Navigation and Return Contract v1.1;
- canonical NikaS Engineering Knowledge Base;
- canonical Proven Integration & Panel Patterns.

## Architecture

The runtime is separated by responsibility:

- `DataAdapter` — Home Assistant state/registry truth, formatting and quality classification;
- `HistoryStore` — history single-flight, cache, concurrency, timeout, parsing and sampling;
- `ViewStore` — lazy creation and reattachment of visited work views;
- `LiderVoltageControlPanel` — persistent shell, navigation, gestures and targeted DOM reconciliation.

The production entrypoint is autonomous and byte-identical to the validated source. Routine `hass` updates are coalesced to one animation frame and must not remount Header, work viewport, background or Bottom Tab Bar.

## UI baseline

- one three-row shell: Header / work viewport / Bottom Tab Bar;
- Header and Bottom Tab Bar never belong to the scroll/zoom subtree;
- one work viewport and one canvas;
- five tabs: Overview / Before / After / History / Diagnostics;
- meaningful typography stays within 12–25 px;
- title plaque is the only return control and shows `Электросеть` + `UI v0.9.0`;
- fixed Home Assistant menu on the left and refresh on the right;
- no permanent zoom buttons.

## Data truth

Confirmed fixed inputs remain limited to the existing public contract. The non-interruptible line is resolved through Entity Registry by unique ID `W0035313411160_input_voltage`; the frontend does not invent its current entity ID. Missing, unknown and unavailable values render as `Нет данных` and never receive a healthy state.

Equipment designation is normalized to three `LIDER PS-7500W-30` modules.

## Statistics lifecycle

Primary history transport is Home Assistant WebSocket `history/history_during_period`; Recorder REST is a fallback. Each selected period owns one cached load. Work is partitioned by graph, with at most two concurrent graph requests and a 60-second terminal timeout. Completed graphs render progressively and remain stable; returning to a cached period does not create duplicate requests. Header refresh invalidates only the active period.

Periods: 24 h / 7 d / 30 d / 12 months.

Generation, produced energy, export and reverse-energy concepts are excluded because they are not part of the factual LIDER installation contract.

## Gesture contract

- pinch 75–200%;
- 97–103% snaps to exactly 100%;
- two-finger double tap resets scale, transform and native scroll;
- one-finger native vertical scroll at 100%;
- transform pan only above 100%;
- stored zoom is local per panel/client;
- post-pinch synthetic clicks are suppressed.

## Diagnostics

Diagnostics starts from verified contract entities and expands only to enabled state-bearing entities sharing their registered Home Assistant devices. Cards expose state, attributes, timestamps and context and open native `more-info`. The entity set is keyed; telemetry changes reconcile only changed entity cards instead of rebuilding the entire diagnostics view.

## Acceptance gates

Automated gates must pass before phone testing:

1. JavaScript syntax and deterministic bundle parity;
2. Python / JSON / YAML validation;
3. NikaS v1.9 and navigation v1.1 invariant checks;
4. exact version/title parity across manifest, panel registration, contract and runtime;
5. factual entity/model checks;
6. HACS and Hassfest validation.

Real-device acceptance remains mandatory before merge: fixed Header/Bottom Bar, native and inertial scrolling, 10 tab switches without white frames, pinch/reset/pan, no telemetry flicker, correct source return, and `24h → 7d → 24h → 7d` history reuse with every graph reaching a terminal state.
