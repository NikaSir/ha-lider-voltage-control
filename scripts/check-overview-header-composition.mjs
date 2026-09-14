import fs from "node:fs";
import vm from "node:vm";

const bundle = fs.readFileSync(
  "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js",
  "utf8",
);

class HTMLElement {
  attachShadow() {
    this.shadowRoot = {};
    return this.shadowRoot;
  }
}

const storage = new Map();
const context = {
  HTMLElement,
  customElements: { get: () => true, define: () => {} },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  window: {
    location: {
      href: "https://ha.local/dashboard-lider",
      origin: "https://ha.local",
      pathname: "/dashboard-lider",
      search: "",
      hash: "",
    },
    history: { pushState: () => {} },
    dispatchEvent: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  },
  document: { referrer: "" },
  URL,
  URLSearchParams,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  performance: { now: () => 1_000 },
  console,
};

vm.createContext(context);
vm.runInContext(bundle + "\nthis.Panel = LiderVoltageControlPanel;", context);

const panel = new context.Panel();
panel._connectionBadge = () => '<button class="overall">Связь</button>';
panel._scenePhase = (phase) => `<div class="scene-phase">${phase}</div>`;
panel._lineCard = () => '<section class="line-card">Линия</section>';

const overview = panel._overview();
const styles = panel._styles();

const headerStart = overview.indexOf('class="installation-header"');
const accent = overview.indexOf('class="installation-accent"');
const heading = overview.indexOf('class="scene-heading"');
const connection = overview.indexOf('class="overall"');
const sceneStart = overview.indexOf('class="installation-scene"');
const equipment = overview.indexOf('class="installation-equipment"');
const phase = overview.indexOf('class="scene-phase"');
const caption = overview.indexOf('class="installation-caption"');

if (!(headerStart >= 0 && accent > headerStart && heading > headerStart &&
      connection > headerStart && sceneStart > connection && equipment > sceneStart &&
      phase > sceneStart && caption > sceneStart)) {
  throw new Error(
    "overview must keep heading and connection in a separate accented header above the photo scene",
  );
}

const installationTag = overview.match(/<section class="installation"[^>]*>/)?.[0] ?? "";
const equipmentTag = overview.match(/<img class="installation-equipment"[^>]*>/)?.[0] ?? "";
if (/role="img"/.test(installationTag)) {
  throw new Error("interactive overview content must not be nested in an image role");
}
if (!/alt="Три стабилизатора LIDER PS7500W-15/.test(equipmentTag) || /aria-hidden="true"/.test(equipmentTag)) {
  throw new Error("equipment image must expose its description without hiding phase controls");
}

for (const rule of [
  ".installation-accent{position:absolute;z-index:0;right:-44px;top:-74px;width:205px;height:205px",
  ".overall{position:relative;z-index:2;width:168px;height:58px",
  ".installation-scene{position:relative;min-height:0;overflow:hidden;border-radius:18px",
  ".overview-page{height:100%;min-height:0;grid-template-rows:minmax(0,1fr) auto}",
  ".viewport[data-view=\"overview\"]:not(.zoomed){overflow-y:hidden}",
  ".installation-header{position:relative;min-width:0;overflow:hidden;padding:8px 6px 10px;display:grid;grid-template-columns:minmax(0,1fr) 168px",
  "@media (max-height:700px){.viewport[data-view=\"overview\"]:not(.zoomed){overflow-y:auto}.overview-page{height:auto}.overview-page .installation{min-height:600px}}",
]) {
  if (!styles.includes(rule)) {
    throw new Error(`overview header layout rule is missing: ${rule}`);
  }
}

const compactRule = styles.match(/@container nikas-panel \(max-width:420px\)\{([^]*?)\}\s*$/)?.[1] ?? "";
for (const compactLayoutRule of [
  ".scene-heading h1{font-size:16px;overflow-wrap:anywhere}",
  ".installation-scene{display:grid;grid-template-columns:31% minmax(0,1fr) 29%;grid-template-rows:repeat(3,minmax(78px,1fr)) 38px",
  ".scene-phase{position:relative;top:auto;left:auto;right:auto;transform:none;width:100%",
  ".scene-phase.phase-a{grid-row:1}.scene-phase.phase-b{grid-row:2}.scene-phase.phase-c{grid-row:3}",
  ".scene-phase.side-input{grid-column:1}.scene-phase.side-output{grid-column:3}",
  ".installation-caption{position:relative;grid-column:1/-1;grid-row:4",
]) {
  if (!compactRule.includes(compactLayoutRule)) {
    throw new Error(`compact overview must use collision-free grid placement: ${compactLayoutRule}`);
  }
}

console.log("Router-style LIDER overview header composition verified");
