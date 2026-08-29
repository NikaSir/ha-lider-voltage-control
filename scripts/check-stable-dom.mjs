import fs from "node:fs";

const sourcePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js";
const bundlePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const source = fs.readFileSync(sourcePath, "utf8");
const bundle = fs.readFileSync(bundlePath, "utf8");

if (bundle !== source) throw new Error("production entrypoint must be byte-identical to validated source");
if (/^\s*(?:import|export)\s/m.test(bundle)) throw new Error("production entrypoint must be autonomous");
if ([...source.matchAll(/shadowRoot\.innerHTML\s*=/g)].length !== 1) throw new Error("shell may be mounted exactly once");
if (source.includes("this._canvas.innerHTML")) throw new Error("work canvas must not be rebuilt with innerHTML");
for (const forbidden of ["history.back(", "100dvh", "window.loadCardHelpers"]) if (source.includes(forbidden)) throw new Error(`forbidden runtime marker: ${forbidden}`);

for (const marker of [
  'const LIDER_UI_VERSION="0.9.0"',
  'const PANEL_TITLE="Электросеть"',
  'class DataAdapter', 'class HistoryStore', 'class ViewStore', 'class LiderVoltageControlPanel',
  'new ViewStore(this)', 'new HistoryStore(this._adapter',
  'requestAnimationFrame', 'this._canvas.replaceChildren(view)',
  'grid-template-rows:auto minmax(0,1fr) auto', 'grid-template-columns:repeat(5,minmax(0,1fr))',
  '--mdc-icon-size:28px', 'font-size:12px', 'touch-action:pan-y', 'overscroll-behavior:contain',
  'HISTORY_TIMEOUT_MS=60000', 'HISTORY_CONCURRENCY=2', 'this.loads=new Map()',
  'history/history_during_period', '&minimal_response&no_attributes&significant_changes_only',
  'config/entity_registry/list', 'SOURCE_ROUTE_AT_KEY', 'age>=0&&age<=30000',
  'ZOOM_STORAGE_KEY', 'this._suppressClicksUntil=Date.now()+500',
  'hass-more-info', 'hass-toggle-menu', 'location-changed', 'LIDER PS-7500W-30', 'Нет данных'
]) if (!source.includes(marker)) throw new Error(`required clean-architecture marker missing: ${marker}`);

const tabBlock = source.match(/const TABS=Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!tabBlock) throw new Error("TABS contract not found");
const tabIds = [...tabBlock[1].matchAll(/\["(overview|before|after|history|diagnostics)"/g)].map(m => m[1]);
if (tabIds.join(",") !== "overview,before,after,history,diagnostics") throw new Error(`unexpected primary tabs: ${tabIds.join(",")}`);

for (const match of source.matchAll(/font-size:(\d+)px/g)) {
  const size = Number(match[1]);
  if (size < 12 || size > 25) throw new Error(`meaningful typography outside 12–25 px: ${match[0]}`);
}
for (const marker of ['.header{position:fixed', '.work-viewport{position:fixed', '.bottom-bar{position:fixed']) if (source.includes(marker)) throw new Error(`independent fixed layer forbidden: ${marker}`);

console.log("LIDER 0.9.0 clean architecture checks passed");
