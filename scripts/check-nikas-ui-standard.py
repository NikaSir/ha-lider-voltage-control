#!/usr/bin/env python3
"""Validate LIDER against canonical NikaS UI v1.9 and navigation v1.1."""
from __future__ import annotations
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CONFIG=json.loads((ROOT/".nikas-ui-standard.json").read_text(encoding="utf-8"))
def require(v,m):
    if not v: raise SystemExit(m)
def text(p):
    f=ROOT/p;require(f.is_file(),f"missing required file: {p}");return f.read_text(encoding="utf-8")
def main():
    require(CONFIG.get("version")=="1.9","NikaS UI version must be 1.9")
    require(CONFIG.get("navigation_contract_version")=="1.1","navigation contract must be 1.1")
    standard=text(CONFIG["standard_path"]);navigation=text(CONFIG["navigation_contract_path"])
    require(hashlib.sha256(standard.encode()).hexdigest()==CONFIG["standard_sha256"],"non-canonical v1.9 standard")
    require(hashlib.sha256(navigation.encode()).hexdigest()==CONFIG["navigation_contract_sha256"],"non-canonical navigation contract")
    runtime=CONFIG.get("runtime_files",[]);entry=CONFIG.get("production_entrypoint")
    require(runtime==[entry],"only production_entrypoint may be a runtime file")
    source=text(entry);core=text("custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js")
    require(source==core,"production entrypoint and validated source must be byte-identical")
    for token in ('const LIDER_UI_VERSION="0.9.0"','const PANEL_TITLE="Электросеть"','class DataAdapter','class HistoryStore','class ViewStore','class LiderVoltageControlPanel','nikas.specialized.source_route.v1','nikas.specialized.source_route_at.v1','/dashboard-house-v11/home','/dashboard-actions/home','/dashboard-infrastructure/overview','return_to','from','sessionStorage','removeItem(','history.pushState','location-changed','<small>UI v','class="title-plaque"','.title-plaque:focus-visible','.title-plaque:active','requestAnimationFrame','this._canvas.replaceChildren(view)','grid-template-rows:auto minmax(0,1fr) auto','grid-template-columns:repeat(5,minmax(0,1fr))','touch-action:pan-y','overscroll-behavior:contain','Нет данных','hass-toggle-menu','hass-more-info'):
        require(token in source,f"required v1.9 runtime invariant missing: {token}")
    for forbidden in CONFIG.get("forbidden_runtime_markers",[]): require(forbidden not in source,f"forbidden runtime marker present: {forbidden}")
    require(re.search(r"^\s*(?:import|export)\b",source,re.MULTILINE) is None,"runtime import/export is forbidden")
    require(re.search(r"\bimport\s*\(",source) is None,"dynamic import is forbidden")
    require(source.count("shadowRoot.innerHTML=")==1,"shell must mount exactly once")
    require("this._canvas.innerHTML" not in source,"work canvas must not be structurally redrawn")
    for name,marker in CONFIG["header_return"].items():
        if name.endswith("_marker"): require(marker in source,f"Header return marker missing: {name} -> {marker}")
    m=re.search(r"const TABS=Object\.freeze\(\[([\s\S]*?)\]\);",source);require(m is not None,"TABS contract missing")
    ids=re.findall(r'\["(overview|before|after|history|diagnostics)"',m.group(1));require(ids==["overview","before","after","history","diagnostics"],f"wrong primary tabs: {ids}")
    for m in re.finditer(r"font-size:(\d+)px",source):
        n=int(m.group(1));require(12<=n<=25,f"meaningful typography outside 12-25px: {n}px")
    pm=json.loads(text("custom_components/lider_voltage_control/panel_manifest.json"))
    require(pm["template_version"]=="1.9","panel template must be 1.9");require(pm["ui_version"]=="0.9.0","panel UI version mismatch")
    require(pm["overview"]["equipment_model"]=="LIDER PS-7500W-30","equipment model mismatch")
    require(pm["history"]["request_concurrency"]==2,"history concurrency must be 2");require(pm["history"]["request_timeout_seconds"]==60,"history timeout must be 60s")
    require(pm["history"]["cache_in_flight_and_completed_periods"] is True,"history cache required");require(pm["runtime_contract"]["synthetic_entity_ids"] is False,"synthetic entity IDs forbidden")
    bc=CONFIG.get("bundle_contract",{});require(bc.get("autonomous") is True and bc.get("runtime_imports") is False,"autonomous bundle contract required");require(bc.get("deterministic") is True,"deterministic bundle required")
    print("NikaS v1.9 clean LIDER contract: PASS")
if __name__=="__main__": main()
