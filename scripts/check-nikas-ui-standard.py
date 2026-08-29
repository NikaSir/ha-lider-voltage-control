#!/usr/bin/env python3
"""Validate LIDER against the canonical NikaS v1.9 and navigation v1.1 contracts."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / ".nikas-ui-standard.json").read_text(encoding="utf-8"))


def require(value: bool, message: str) -> None:
    if not value:
        raise SystemExit(message)


def text(path: str) -> str:
    target = ROOT / path
    require(target.is_file(), f"missing required file: {path}")
    return target.read_text(encoding="utf-8")


def main() -> None:
    require(CONFIG.get("version") == "1.9", "NikaS UI version must be 1.9")
    require(CONFIG.get("navigation_contract_version") == "1.1", "navigation contract must be 1.1")

    standard = text(CONFIG["standard_path"])
    navigation = text(CONFIG["navigation_contract_path"])
    require(hashlib.sha256(standard.encode()).hexdigest() == CONFIG["standard_sha256"], "non-canonical v1.9 standard")
    require(hashlib.sha256(navigation.encode()).hexdigest() == CONFIG["navigation_contract_sha256"], "non-canonical navigation contract")

    runtime_files = CONFIG.get("runtime_files", [])
    entrypoint = CONFIG.get("production_entrypoint")
    require(runtime_files == [entrypoint], "only production_entrypoint may be a runtime file")
    source = text(entrypoint)
    core = text("custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js")
    require(source == core, "production entrypoint and validated source must be byte-identical")

    for token in (
        'const LIDER_UI_VERSION = "0.9.0"',
        'const PANEL_TITLE = "Электросеть"',
        'class DataAdapter',
        'class HistoryStore',
        'class ViewStore',
        'class LiderVoltageControlPanel',
        'nikas.specialized.source_route.v1',
        'nikas.specialized.source_route_at.v1',
        '/dashboard-house-v11/home',
        '/dashboard-actions/home',
        '/dashboard-infrastructure/overview',
        'return_to',
        'from',
        'sessionStorage',
        'removeItem(',
        'history.pushState',
        'location-changed',
        '<small>UI v',
        'class="title-plaque"',
        '.title-plaque:focus-visible',
        '.title-plaque:active',
        'requestAnimationFrame',
        'this._canvas.replaceChildren(view)',
        'grid-template-rows:auto minmax(0,1fr) auto',
        'grid-template-columns:repeat(5,minmax(0,1fr))',
        'touch-action:pan-y',
        'overscroll-behavior:contain',
        'Нет данных',
        'hass-toggle-menu',
        'hass-more-info',
    ):
        require(token in source, f"required v1.9 runtime invariant missing: {token}")

    for forbidden in CONFIG.get("forbidden_runtime_markers", []):
        require(forbidden not in source, f"forbidden runtime marker present: {forbidden}")
    require(re.search(r"^\s*(?:import|export)\b", source, re.MULTILINE) is None, "runtime import/export is forbidden")
    require(re.search(r"\bimport\s*\(", source) is None, "dynamic import is forbidden")
    require(source.count("shadowRoot.innerHTML =") == 1, "shell must mount exactly once")
    require("this._canvas.innerHTML" not in source, "work canvas must not be structurally redrawn")

    markers = CONFIG["header_return"]
    for name, marker in markers.items():
        if name.endswith("_marker"):
            require(marker in source, f"Header return marker missing: {name} -> {marker}")

    tab_match = re.search(r"const TABS = Object\.freeze\(\[([\s\S]*?)\]\);", source)
    require(tab_match is not None, "TABS contract missing")
    tab_ids = re.findall(r'\["(overview|before|after|history|diagnostics)"', tab_match.group(1))
    require(tab_ids == ["overview", "before", "after", "history", "diagnostics"], f"wrong primary tabs: {tab_ids}")

    for match in re.finditer(r"font-size:(\d+)px", source):
        size = int(match.group(1))
        require(12 <= size <= 25, f"meaningful typography outside 12-25px: {size}px")

    panel_manifest = json.loads(text("custom_components/lider_voltage_control/panel_manifest.json"))
    require(panel_manifest["template_version"] == "1.9", "panel template must be 1.9")
    require(panel_manifest["ui_version"] == "0.9.0", "panel manifest UI version mismatch")
    require(panel_manifest["overview"]["equipment_model"] == "LIDER PS-7500W-30", "equipment model mismatch")
    require(panel_manifest["history"]["request_concurrency"] == 2, "history concurrency must be 2")
    require(panel_manifest["history"]["request_timeout_seconds"] == 60, "history timeout must be 60s")
    require(panel_manifest["history"]["cache_in_flight_and_completed_periods"] is True, "history cache required")
    require(panel_manifest["runtime_contract"]["synthetic_entity_ids"] is False, "synthetic entity IDs forbidden")

    build = CONFIG.get("bundle_contract", {})
    require(build.get("autonomous") is True and build.get("runtime_imports") is False, "autonomous bundle contract required")
    require(build.get("deterministic") is True, "deterministic bundle required")
    print("NikaS v1.9 clean LIDER contract: PASS")


if __name__ == "__main__":
    main()
