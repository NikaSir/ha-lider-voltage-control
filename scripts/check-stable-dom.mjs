import fs from "node:fs";
import vm from "node:vm";

const panelPath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js";
const uiLayerPath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-ui050.js";
const entryPath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const source = fs.readFileSync(panelPath, "utf8") + "\nthis.Panel = LiderVoltageControlPanel;";
const uiLayerSource = fs.readFileSync(uiLayerPath, "utf8");
const entrySource = fs.readFileSync(entryPath, "utf8");

class HTMLElement {
  attachShadow() {
    this.shadowRoot = {};
    return this.shadowRoot;
  }
}

const storage = new Map();
let intervalCallback = null;
const context = {
  HTMLElement,
  customElements: { get: () => true, define: () => {} },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  setInterval: (callback) => {
    intervalCallback = callback;
    return 1;
  },
  clearInterval: () => {},
  setTimeout: () => {},
  clearTimeout: () => {},
  console,
};

vm.createContext(context);
vm.runInContext(source, context);

const panel = new context.Panel();
panel._mounted = true;
panel._registryLoaded = true;
panel._captureTelemetrySnapshot = () => {};
panel._renderContent = () => {
  throw new Error("set hass attempted structural rendering");
};
let livePatches = 0;
panel._updateLiveDom = () => { livePatches += 1; };
panel.hass = { states: {} };
if (livePatches !== 1) throw new Error("set hass must patch the existing DOM exactly once");

let badgePatches = 0;
panel._view = "overview";
panel.isConnected = true;
panel._statusTimer = null;
panel._updateConnectionBadge = () => { badgePatches += 1; };
panel._startStatusTimer();
intervalCallback();
if (badgePatches !== 1) throw new Error("freshness timer must update only the badge");

const registryPanel = new context.Panel();
registryPanel._mounted = true;
registryPanel._view = "overview";
registryPanel._hass = { states: {}, callWS: async () => [] };
registryPanel._renderContent = () => {
  throw new Error("registry completion attempted structural rendering");
};
let registryPatches = 0;
registryPanel._updateLiveDom = () => { registryPatches += 1; };
await registryPanel._resolveRegistryEntities();
if (registryPatches !== 1) throw new Error("registry completion must patch the existing DOM");

const renderCalls = [...source.matchAll(/this\._renderContent\(\)/g)].length;
if (renderCalls !== 2) {
  throw new Error(`structural rendering must remain limited to initial mount and tab changes; found ${renderCalls} call sites`);
}

if (!uiLayerSource.includes('this._tabButton("diagnostics"')) {
  throw new Error("diagnostics tab is missing from the UI layer");
}
if (!uiLayerSource.includes("window.history.pushState")) {
  throw new Error("return header must use explicit Home Assistant navigation");
}
if (uiLayerSource.includes("history.back(")) {
  throw new Error("history.back() is forbidden for specialized-panel return navigation");
}
if (!uiLayerSource.includes("nikas.specialized.source_route.v1")) {
  throw new Error("source-route handoff contract is missing");
}
if (!uiLayerSource.includes("replaceChildren") && !uiLayerSource.includes("reconcileTree")) {
  throw new Error("diagnostics live updates must remain scoped to the working canvas");
}

if (!entrySource.includes("grid-template-columns:repeat(6,minmax(0,1fr))")) {
  throw new Error("bottom navigation must use exactly six equal columns");
}
if (!entrySource.includes("--mdc-icon-size:24px")) {
  throw new Error("compact bottom navigation must use 24 px icons");
}
if (!entrySource.includes("style.dataset.nikasUi = UI_VERSION")) {
  throw new Error("UI 0.5.1 overrides must be injected as an independent valid style block");
}
if (entrySource.includes(".concat([")) {
  throw new Error("array-to-string CSS concatenation is forbidden in the entry layer");
}

console.log("Stable DOM, specialized Header and compact navigation contracts verified");
