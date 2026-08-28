import fs from "node:fs";
import vm from "node:vm";

const sourcePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js";
const bundlePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const source = fs.readFileSync(sourcePath, "utf8");
const bundle = fs.readFileSync(bundlePath, "utf8");
const banner = "/* GENERATED BUNDLE — run node scripts/build-frontend-bundle.mjs; do not edit directly. */\n";

if (bundle !== banner + source) throw new Error("production bundle is not synchronized with its source");
if (/^\s*import\s/m.test(bundle)) throw new Error("production bundle must be autonomous and contain no imports");
if ([...bundle.matchAll(/shadowRoot\.innerHTML\s*=/g)].length !== 1) {
  throw new Error("shadowRoot.innerHTML is allowed exactly once during initial shell mount");
}
if (bundle.includes("this._canvas.innerHTML")) throw new Error("work canvas must never be rebuilt with innerHTML");
if (bundle.includes("history.back(")) throw new Error("history.back() is forbidden");
if ([...bundle.matchAll(/this\._tabButton\("/g)].length !== 5 || bundle.includes('this._tabButton("line"')) {
  throw new Error("bottom navigation must expose exactly five primary destinations");
}

for (const marker of [
  'const LIDER_UI_VERSION = "0.6.1"',
  'new Set(["overview", "before", "after", "history", "diagnostics"])',
  'this._viewCache = new Map()',
  'this._canvas.replaceChildren(root)',
  'this._queueLiveUpdate()',
  'this._suppressClicksUntil = Date.now() + 500',
  'if (event.touches.length > 0) return',
  'sessionStorage.getItem(RETURN_ROUTE_KEY)',
  'window.history.pushState',
  'this._tabButton("diagnostics", "mdi:stethoscope", "Диагн.", "Диагностика")',
  'grid-template-columns:repeat(5,minmax(0,1fr))',
  '--mdc-icon-size:28px',
  '.tabs button small{display:block;max-width:100%;font-size:12px',
]) {
  if (!bundle.includes(marker)) throw new Error(`required UI contract marker is missing: ${marker}`);
}

if ([...bundle.matchAll(/'<main class="viewport">'/g)].length !== 1) {
  throw new Error("panel must mount exactly one work viewport");
}

for (const match of bundle.matchAll(/font-size:(\d+)px/g)) {
  const size = Number(match[1]);
  if (size < 12 || size > 25) throw new Error(`meaningful typography outside 12–25 px: ${match[0]}`);
}

class HTMLElement {
  attachShadow() {
    this.shadowRoot = {};
    return this.shadowRoot;
  }
}

const storage = new Map();
const session = new Map();
const frames = new Map();
let nextFrame = 1;
let intervalCallback = null;
const context = {
  HTMLElement,
  customElements: { get: () => true, define: () => {} },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  sessionStorage: {
    getItem: (key) => session.get(key) ?? null,
    setItem: (key, value) => session.set(key, value),
    removeItem: (key) => session.delete(key),
  },
  window: {
    location: { href: "https://ha.local/dashboard-lider", origin: "https://ha.local" },
    history: { pushState: () => {} },
    dispatchEvent: () => {},
  },
  document: { referrer: "" },
  URL,
  requestAnimationFrame: (callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame: (id) => frames.delete(id),
  setInterval: (callback) => {
    intervalCallback = callback;
    return 1;
  },
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  performance: { now: () => 1_000 },
  console,
};

function flushFrames() {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback());
}

vm.createContext(context);
vm.runInContext(source + "\nthis.Panel = LiderVoltageControlPanel; this.resolveReturnRoute = resolveReturnRoute;", context);

session.set("nikas.lider.return_route.v1", "/dashboard-house-v11/home");
if (context.resolveReturnRoute({}) !== "/dashboard-house-v11/home") {
  throw new Error("saved Header return route must survive a panel reload");
}

const panel = new context.Panel();
panel._mounted = true;
panel._registryLoaded = true;
panel._captureTelemetrySnapshot = () => {};
panel._renderContent = () => { throw new Error("set hass attempted structural rendering"); };
let livePatches = 0;
panel._updateLiveDom = () => { livePatches += 1; };
panel.hass = { states: {} };
panel.hass = { states: { "sensor.unrelated": { state: "1", attributes: {} } } };
if (frames.size !== 1) throw new Error("multiple hass updates must coalesce into one animation frame");
flushFrames();
if (livePatches !== 1) throw new Error("coalesced hass updates must patch the mounted DOM once");

let badgePatches = 0;
panel._view = "overview";
panel.isConnected = true;
panel._statusTimer = null;
panel._updateConnectionBadge = () => { badgePatches += 1; };
panel._startStatusTimer();
intervalCallback();
if (badgePatches !== 1) throw new Error("freshness timer must patch only the indicator category");

const registryPanel = new context.Panel();
registryPanel._mounted = true;
registryPanel._hass = { states: {}, callWS: async () => [] };
registryPanel._renderContent = () => { throw new Error("registry completion attempted shell rendering"); };
let registryPatches = 0;
registryPanel._updateLiveDom = () => { registryPatches += 1; };
await registryPanel._resolveRegistryEntities();
flushFrames();
if (registryPatches !== 1) throw new Error("registry completion must reconcile only the current view");

const coldHistory = new context.Panel();
coldHistory._mounted = true;
coldHistory._registryLoaded = true;
coldHistory._view = "history";
coldHistory._renderedView = "history";
coldHistory._canvas = {};
let historyMounts = 0;
coldHistory._mountHistoryCards = () => { historyMounts += 1; };
coldHistory._updateLiveDom();
if (historyMounts !== 1) throw new Error("cold Entity Registry completion must mount history cards");

if (panel._worst(["unavailable", "emergency", "normal"]) !== "emergency") {
  throw new Error("known emergency must not be hidden by an unavailable phase");
}
if (panel._worst(["unavailable", "normal"]) !== "unavailable") {
  throw new Error("unavailable data must remain explicit when there is no known alarm");
}
panel._connectionState = () => "unknown";
panel._binaryState = (entityId) => entityId === "binary_sensor.power_phase_loss" ? "on" : null;
if (panel._inputTelemetryState() !== "phase-loss") {
  throw new Error("confirmed phase loss must outrank an unknown connection state");
}

panel._gesture = { kind: "pinch", moved: true, started: 0 };
panel._zoom = { scale: 1.5, x: 0, y: 0 };
panel._saveZoom = () => {};
panel._touchEnd({ touches: [{}] });
if (!panel._gesture) throw new Error("pinch must wait until every finger is lifted");
panel._touchEnd({ touches: [] });
if (panel._gesture || panel._suppressClicksUntil <= Date.now()) {
  throw new Error("completed pinch must clear the gesture and suppress its synthetic click");
}

console.log("Autonomous bundle, stable DOM, gestures, routing and five-tab shell verified");
