import fs from "node:fs";
import vm from "node:vm";

const panelPath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const source = fs.readFileSync(panelPath, "utf8") + "\nthis.Panel = LiderVoltageControlPanel;";

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

console.log("Stable DOM contract verified");
