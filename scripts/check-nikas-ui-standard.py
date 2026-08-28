#!/usr/bin/env python3
"""Fail CI when LIDER drifts from the mandatory NikaS UI contract."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / ".nikas-ui-standard.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def read_relative(path: str) -> str:
    target = ROOT / path
    require(target.is_file(), f"missing required file: {path}")
    return target.read_text(encoding="utf-8")


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    require(config.get("version") == "1.7", "NikaS UI standard version must be 1.7")

    standard_path = config.get("standard_path", "docs/NIKAS_SPECIALIZED_PANEL_UI_STANDARD.md")
    standard = read_relative(standard_path)
    digest = hashlib.sha256(standard.encode("utf-8")).hexdigest()
    require(digest == config.get("standard_sha256"), "local NikaS UI standard is not the canonical v1.7 copy")
    for clause in (
        "Center title plaque — return to the source NikaS base panel",
        'sessionStorage["nikas.specialized.source_route.v1"]',
        "return_to",
        "history.pushState()",
        "history.back()",
        "first valid explicit route",
        "version-only `UI vX.Y.Z`",
        ":focus-visible",
    ):
        require(clause in standard, f"canonical Header-return clause missing: {clause}")

    require(config.get("role") == "specialized", "LIDER must declare the specialized role")
    runtime_files = config.get("runtime_files", [])
    require(isinstance(runtime_files, list) and runtime_files, "runtime_files must be a non-empty list")
    require(len(runtime_files) == len(set(runtime_files)), "runtime_files must not contain duplicates")
    sources = "\n".join(read_relative(path) for path in runtime_files)

    production_entrypoint = config.get("production_entrypoint")
    require(production_entrypoint in runtime_files, "production_entrypoint must be checked as a runtime file")

    for token in (
        "nikas.specialized.source_route.v1",
        "/dashboard-house",
        "/dashboard-actions",
        "/dashboard-infrastructure",
        "return_to",
        "from",
        "history.pushState",
        "location-changed",
        "UI v",
        "sessionStorage",
        "removeItem(",
        "window.location.origin",
        "url.origin",
        "url.pathname",
        "document.referrer",
        "parent_route",
    ):
        require(token in sources, f"specialized Header-return runtime missing token: {token}")
    require("history.back(" not in sources, "history.back() is forbidden by the NikaS routing contract")
    require("<button" in sources, "center title must be a semantic button")

    markers = config.get("header_return", {})
    require(isinstance(markers, dict) and markers, "specialized panel must declare header_return markers")
    for name in (
        "button_marker",
        "version_marker",
        "focus_marker",
        "pressed_marker",
        "explicit_precedence_marker",
        "capture_once_marker",
    ):
        marker = markers.get(name)
        require(isinstance(marker, str) and marker, f"header_return.{name} must be configured")
        require(marker in sources, f"specialized Header-return marker missing: {marker}")

    version_marker = markers["version_marker"]
    require("UI v" in version_marker, "header_return.version_marker must identify the exact UI version line")
    require("·" not in version_marker, "header_return.version_marker must be version-only")

    for marker in config.get("forbidden_runtime_markers", []):
        require(marker not in sources, f"forbidden specialized-panel runtime marker present: {marker}")


if __name__ == "__main__":
    main()
