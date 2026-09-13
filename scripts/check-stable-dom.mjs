import fs from "node:fs";
import vm from "node:vm";

const standardConfig = JSON.parse(fs.readFileSync(".nikas-ui-standard.json", "utf8"));
if (standardConfig.peer_selector?.present !== false ||
    standardConfig.peer_selector?.reason !== "single_three_phase_device") {
  throw new Error("L1/L2/L3 must remain phases of one LIDER device without a peer selector");
}

const sourcePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js";
const shellPath = "templates/shell_v2/nikas-specialized-shell.js";
const bundlePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const source = fs.readFileSync(sourcePath, "utf8");
const shell = fs.readFileSync(shellPath, "utf8");
const bundle = fs.readFileSync(bundlePath, "utf8");
const banner = "/* GENERATED BUNDLE — run node scripts/build-frontend-bundle.mjs; do not edit directly. */\n";
const expected = banner +
  `// BEGIN ${shellPath}\n${shell.trimEnd()}\n// END ${shellPath}\n` +
  `// BEGIN ${sourcePath}\n${source.trimEnd()}\n// END ${sourcePath}\n`;

if (bundle !== expected) throw new Error("production bundle is not synchronized with its source kit and panel source");
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
  'const LIDER_UI_VERSION = "0.8.8"',
  '.title{text-align:center;display:grid;place-content:center;line-height:1.08}',
  '.title small{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px',
  'const NIKAS_SHELL_V2_VERSION = "2.1"',
  'const PANEL_TITLE = "Электросеть"',
  'new Set(["overview", "before", "after", "history", "diagnostics"])',
  'this._viewCache = new Map()',
  'this._canvas.replaceChildren(root)',
  'this._canvas.dataset.view = this._view',
  'this._viewport.dataset.view = this._view',
  'this._queueLiveUpdate()',
  'this._suppressClicksUntil = Date.now() + 500',
  'if (event.touches.length > 0) return',
  'function captureNikasShellReturnRoute({ parentRoute } = {})',
  'if (!route || !timestamp) return null',
  'age < 0',
  'captureNikasShellReturnRoute',
  'createNikasShellScrollBoundaryGuard',
  'host.addEventListener("touchmove", moveTouch, { passive: false, capture: true })',
  'window.history.pushState',
  '.title-return:focus-visible',
  '.title-return:active',
  'class="page loading-page"',
  'this._tabButton("diagnostics", "mdi:stethoscope", "Диагн.", "Диагностика")',
  'this._tabButton("after", "mdi:arrow-right-bold", "После")',
  '<p>Сеть → LIDER → дом</p>',
  'class="page overview-page"',
  'grid-template-columns:repeat(5,minmax(0,1fr))',
  '--mdc-icon-size:26px',
  '.tabs button small{display:block;flex:0 0 14px;max-width:100%;font-size:12px',
  '@media (max-width:560px)',
  '.input-metrics{grid-template-columns:1fr;gap:3px}',
  "V: 'В'",
  "A: 'А'",
  "W: 'Вт'",
  "Hz: 'Гц'",
  ':host{position:relative;display:block;inline-size:100%;block-size:100%',
  '.app{position:absolute;inset:0;display:grid;container:nikas-panel / inline-size;grid-template-rows:',
  'calc(60px + env(safe-area-inset-top,0px))',
  'calc(64px + env(safe-area-inset-bottom,0px))',
  'max-width:1280px',
  'minmax(0,1fr)',
  '.viewport{position:relative;',
  'overscroll-behavior:none;touch-action:pan-y',
  '.viewport[data-view=\\"overview\\"]:not(.zoomed){overflow-y:hidden}',
  '.canvas{width:100%;max-width:1280px;height:100%;min-height:100%',
  '.overview-page{height:100%;min-height:0;grid-template-rows:minmax(0,1fr) auto}',
  '.overview-page .installation{min-height:0;aspect-ratio:auto}',
  '.tabs{position:relative;',
  'this._hass.callApi("get", historyPath)',
  '&minimal_response&no_attributes&significant_changes_only',
  'this._historyLoadingKey === loadKey',
  'mountToken === this._historyMountToken',
  'HISTORY_REQUEST_TIMEOUT_MS = 60_000',
  'HISTORY_REQUEST_CONCURRENCY = 2',
  'this._historyLoads = new Map()',
  'this._historyLoads.get(loadKey) === load',
  'class="history-direct-card"',
]) {
  if (!bundle.includes(marker)) throw new Error(`required UI contract marker is missing: ${marker}`);
}

if (bundle.includes("window.loadCardHelpers")) {
  throw new Error("integration-owned history must not depend on Lovelace card helpers");
}

for (const forbiddenShellMarker of [
  '100vw',
  '100vh',
  'height:100dvh',
  ':host{position:fixed',
  '.header{position:fixed',
  '.viewport{position:fixed',
  '.tabs{position:fixed',
]) {
  if (bundle.includes(forbiddenShellMarker)) {
    throw new Error(`phone shell can leak into the outer scrolling surface: ${forbiddenShellMarker}`);
  }
}

for (const clippedHeaderMarker of [
  '.title{text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px}',
  '.title small{margin-top:3px',
]) {
  if (bundle.includes(clippedHeaderMarker)) {
    throw new Error(`Header version can overflow the 52px title plaque: ${clippedHeaderMarker}`);
  }
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
    location: { href: "https://ha.local/dashboard-lider", origin: "https://ha.local", pathname: "/dashboard-lider", search: "", hash: "" },
    history: { pushState: () => {} },
    dispatchEvent: () => {},
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => session.set(key, value),
      removeItem: (key) => session.delete(key),
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  },
  document: { referrer: "" },
  URL,
  URLSearchParams,
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
vm.runInContext(bundle + "\nthis.Panel = LiderVoltageControlPanel; this.captureReturnRoute = captureNikasShellReturnRoute; this.shouldBlockBoundaryMove = shouldBlockNikasShellBoundaryMove;", context);

if (!context.shouldBlockBoundaryMove({
  deltaX: 0, deltaY: 12, inViewport: true, scrollTop: 0, scrollHeight: 900, clientHeight: 500,
})) throw new Error("top-edge pull must be contained inside the panel host");
if (!context.shouldBlockBoundaryMove({
  deltaX: 0, deltaY: -12, inViewport: true, scrollTop: 400, scrollHeight: 900, clientHeight: 500,
})) throw new Error("bottom-edge push must be contained inside the panel host");
if (context.shouldBlockBoundaryMove({
  deltaX: 0, deltaY: -12, inViewport: true, scrollTop: 200, scrollHeight: 900, clientHeight: 500,
})) throw new Error("native scrolling inside the work viewport must remain available");
if (context.shouldBlockBoundaryMove({
  deltaX: 14, deltaY: 4, inViewport: false, scrollTop: 0, scrollHeight: 0, clientHeight: 0,
})) throw new Error("horizontal gestures must not be captured by the vertical boundary guard");

for (const source of ["/dashboard-actions/home", "/dashboard-house-v13/home", "/dashboard-rooms-v11/rooms"]) {
  context.window.location.search = "?return_to="+source+"&from="+source;
  storage.set("nikas.lider.return_route.v1", source);
  session.set("nikas.specialized.source_route.v1", source);
  session.set("nikas.specialized.source_route_at.v1", String(Date.now()));
  if (context.captureReturnRoute({panelId: "lider", parentRoute: "/home/overview"}) !== "/home/overview") {
    throw new Error("main title must ignore opening source, storage, and query");
  }
}

const panel = new context.Panel();
if (!panel._viewHtml().includes('class="page loading-page"') ||
    !panel._viewHtml().includes("Загрузка данных…")) {
  throw new Error("cold mount must expose a deterministic loading surface before hass arrives");
}
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
coldHistory._loading = false;
coldHistory._renderedLoading = false;
coldHistory._registryLoaded = true;
coldHistory._view = "history";
coldHistory._renderedView = "history";
coldHistory._canvas = {};
let historyMounts = 0;
coldHistory._mountHistoryCards = () => { historyMounts += 1; };
coldHistory._updateLiveDom();
if (historyMounts !== 1) throw new Error("cold Entity Registry completion must mount history cards");

const historyPanel = new context.Panel();
historyPanel._hass = {
  locale: { language: "ru" },
  states: {
    "sensor.power_monitor_voltage_a": { attributes: { unit_of_measurement: "V" } },
  },
};
const historyStart = new Date("2026-08-27T00:00:00.000Z");
const historyEnd = new Date("2026-08-28T00:00:00.000Z");
const historyPath = historyPanel._historyApiPath(
  historyStart,
  historyEnd,
  ["sensor.power_monitor_voltage_a", "sensor.power_monitor_voltage_b"]
);
for (const marker of [
  "history/period/2026-08-27T00%3A00%3A00.000Z",
  "end_time=2026-08-28T00%3A00%3A00.000Z",
  "filter_entity_id=sensor.power_monitor_voltage_a%2Csensor.power_monitor_voltage_b",
  "minimal_response&no_attributes",
]) {
  if (!historyPath.includes(marker)) throw new Error(`Recorder history path is incomplete: ${marker}`);
}
const recorderSeries = historyPanel._historySeriesByEntity([[
  { entity_id: "sensor.power_monitor_voltage_a", state: "228.5", last_changed: "2026-08-27T00:00:00.000Z" },
  { state: "231.0", last_changed: "2026-08-27T12:00:00.000Z" },
]]);
if (recorderSeries["sensor.power_monitor_voltage_a"]?.length !== 2 ||
    recorderSeries["sensor.power_monitor_voltage_a"][1].value !== 231) {
  throw new Error("minimal Recorder history response is not parsed correctly");
}
const manyPoints = Array.from({ length: 1000 }, (_, index) => ({ time: index, value: index }));
const sampledPoints = historyPanel._historySamplePoints(manyPoints);
if (sampledPoints.length !== 360 || sampledPoints[0] !== manyPoints[0] ||
    sampledPoints.at(-1) !== manyPoints.at(-1)) {
  throw new Error("history SVG sampling must preserve the first and last factual points");
}
const graphHtml = historyPanel._historyGraphHtml({
  title: "Напряжение",
  entities: [{ entity: "sensor.power_monitor_voltage_a", name: "Фаза A" }],
}, recorderSeries, historyStart, historyEnd);
if (!graphHtml.includes('class="history-direct-card"') || !graphHtml.includes("<polyline") ||
    !graphHtml.includes("Фаза A") || !graphHtml.includes("В")) {
  throw new Error("autonomous Recorder graph does not expose its factual series");
}

const singleFlightHistory = new context.Panel();
singleFlightHistory._view = "history";
singleFlightHistory._registryLoaded = true;
singleFlightHistory._historyPeriod = "24h";
singleFlightHistory._canvas = {
  querySelector: () => null,
  querySelectorAll: () => [],
};
singleFlightHistory._historyCardConfigs = () => ({
  "before-voltage": {
    title: "Напряжение",
    entities: [{ entity: "sensor.power_monitor_voltage_a", name: "Фаза A" }],
  },
});
let recorderCalls = 0;
let resolveRecorder;
singleFlightHistory._hass = {
  callApi: () => {
    recorderCalls += 1;
    return new Promise((resolve) => { resolveRecorder = resolve; });
  },
};
const firstHistoryLoad = singleFlightHistory._mountHistoryCards();
const duplicateHistoryLoad = singleFlightHistory._mountHistoryCards();
if (recorderCalls !== 1 || singleFlightHistory._historyLoadingKey !== "24h") {
  throw new Error("telemetry must not start a duplicate Recorder request for the active period");
}
resolveRecorder([]);
await Promise.all([firstHistoryLoad, duplicateHistoryLoad]);
if (singleFlightHistory._historyMountedPeriod !== "24h" ||
    singleFlightHistory._historyLoadingKey !== null) {
  throw new Error("a completed Recorder request must settle the active period exactly once");
}

const concurrencyHistory = new context.Panel();
concurrencyHistory._view = "history";
concurrencyHistory._historyPeriod = "7d";
concurrencyHistory._canvas = { querySelector: () => null };
const concurrencyPending = [];
let concurrentRecorderCalls = 0;
concurrencyHistory._hass = {
  callApi: () => {
    concurrentRecorderCalls += 1;
    return new Promise((resolve) => concurrencyPending.push(resolve));
  },
};
const concurrencyConfigs = Object.fromEntries(["voltage", "current", "power"].map((metric) => [
  `before-${metric}`,
  { title: metric, entities: [{ entity: `sensor.power_monitor_${metric}_a`, name: "Фаза A" }] },
]));
const concurrencyLoad = concurrencyHistory._startHistoryLoad(
  "7d", { hours: 168 }, concurrencyConfigs);
concurrencyHistory._historyLoads.set("7d", concurrencyLoad);
if (concurrentRecorderCalls !== 2) {
  throw new Error("Recorder graph loading must enforce its concurrency limit");
}
concurrencyPending.shift()([]);
await new Promise((resolve) => setImmediate(resolve));
if (concurrentRecorderCalls !== 3) {
  throw new Error("the next Recorder graph must start only after a worker becomes available");
}
concurrencyPending.splice(0).forEach((resolve) => resolve([]));
await concurrencyLoad.promise;

const periodCacheHistory = new context.Panel();
periodCacheHistory._view = "history";
periodCacheHistory._registryLoaded = true;
periodCacheHistory._historyPeriod = "24h";
periodCacheHistory._canvas = {
  querySelector: () => null,
  querySelectorAll: () => [],
};
periodCacheHistory._historyCardConfigs = () => ({
  "before-voltage": {
    title: "Напряжение",
    entities: [{ entity: "sensor.power_monitor_voltage_a", name: "Фаза A" }],
  },
  "before-power": {
    title: "Мощность",
    entities: [{ entity: "sensor.power_monitor_power_a", name: "Фаза A" }],
  },
});
const pendingPeriodRequests = [];
let periodRecorderCalls = 0;
periodCacheHistory._hass = {
  callApi: () => {
    periodRecorderCalls += 1;
    return new Promise((resolve) => pendingPeriodRequests.push(resolve));
  },
};
const initial24hLoad = periodCacheHistory._mountHistoryCards();
if (periodRecorderCalls !== 2) {
  throw new Error("Recorder history must be partitioned into independently renderable graph requests");
}
pendingPeriodRequests.splice(0).forEach((resolve) => resolve([]));
await initial24hLoad;
periodCacheHistory._historyPeriod = "7d";
const initial7dLoad = periodCacheHistory._mountHistoryCards();
if (periodRecorderCalls !== 4) throw new Error("the new period must start its own graph load");
periodCacheHistory._historyPeriod = "24h";
await periodCacheHistory._mountHistoryCards();
if (periodRecorderCalls !== 4) throw new Error("returning to a completed period must use its cache");
periodCacheHistory._historyPeriod = "7d";
const resumed7dLoad = periodCacheHistory._mountHistoryCards();
if (periodRecorderCalls !== 4) throw new Error("returning to an in-flight period must reuse its requests");
pendingPeriodRequests.splice(0).forEach((resolve) => resolve([]));
await Promise.all([initial7dLoad, resumed7dLoad]);
if (periodCacheHistory._historyMountedPeriod !== "7d" ||
    periodCacheHistory._historyLoadingKey !== null) {
  throw new Error("the resumed weekly period must settle without a duplicate Recorder request");
}

const timeoutHistory = new context.Panel();
timeoutHistory._hass = { callApi: () => new Promise(() => {}) };
context.setTimeout = (callback) => { callback(); return 9; };
let historyTimedOut = false;
try {
  await timeoutHistory._historyRequest("history/period/test");
} catch (error) {
  historyTimedOut = error.message === "Recorder history timeout";
}
if (!historyTimedOut) throw new Error("Recorder history must leave loading state after its timeout");
context.setTimeout = () => 1;

if (panel._worst(["unavailable", "emergency", "normal"]) !== "emergency") {
  throw new Error("known emergency must not be hidden by an unavailable phase");
}
if (panel._worst(["unavailable", "normal"]) !== "unavailable") {
  throw new Error("unavailable data must remain explicit when there is no known alarm");
}
const telemetryNow = Date.now();
const dayAgo = telemetryNow - 86_400_000;
const voltageA = "sensor.power_monitor_voltage_a";
const voltageB = "sensor.power_monitor_voltage_b";
const voltageC = "sensor.power_monitor_voltage_c";
const currentB = "sensor.power_monitor_current_b";
panel._telemetrySnapshot = {
  updatedAt: dayAgo,
  values: {
    [voltageA]: { state: "220", unit: "V", reportedAt: dayAgo },
  },
};
panel._hass = {
  locale: { language: "ru" },
  states: {
    "binary_sensor.power_meter_online": { state: "on", attributes: {} },
    [voltageA]: { state: "unavailable", attributes: {}, last_reported: new Date(telemetryNow).toISOString() },
    [voltageB]: { state: "221", attributes: { unit_of_measurement: "V" }, last_reported: new Date(telemetryNow).toISOString() },
    [voltageC]: { state: "222", attributes: { unit_of_measurement: "V" }, last_reported: new Date(telemetryNow).toISOString() },
    [currentB]: { state: "5", attributes: { unit_of_measurement: "A" }, last_reported: new Date(telemetryNow).toISOString() },
  },
};
const cachedVoltage = panel._reading(voltageA);
if (!cachedVoltage.available || cachedVoltage.quality !== "stale" || cachedVoltage.reportedAt !== dayAgo) {
  throw new Error("cached phase voltage must retain its stale quality and measurement timestamp");
}
const cachedScene = panel._sceneReading("Напряжение", voltageA, "before");
if (!cachedScene.includes("220,0 В") || !cachedScene.includes("устарело") || cachedScene.includes("scene-reading normal")) {
  throw new Error("cached phase voltage must remain visible but must never look current or normal");
}
if (panel._telemetryFreshness().key !== "stale") {
  throw new Error("one stale required phase must make aggregate voltage telemetry stale");
}
panel._hass.states[voltageA] = {
  state: "223",
  attributes: { unit_of_measurement: "V" },
  last_reported: new Date(telemetryNow).toISOString(),
};
const recoveredVoltage = panel._reading(voltageA);
if (!recoveredVoltage.available || recoveredVoltage.quality !== "current" ||
    panel._entitySeverity(voltageA, "before") !== "normal" ||
    panel._telemetryFreshness().key !== "fresh") {
  throw new Error("a recovered phase must return to current quality and normal aggregate freshness");
}
panel._hass.states[voltageA].last_reported = new Date(dayAgo).toISOString();
if (panel._reading(voltageA).quality !== "stale" ||
    panel._entitySeverity(voltageA, "before") !== "stale") {
  throw new Error("an old live phase timestamp must also prevent a normal status");
}
panel._hass.states[voltageA].last_reported = new Date(telemetryNow).toISOString();
panel._hass.states["binary_sensor.power_meter_online"].state = "unknown";
if (panel._telemetryFreshness().key !== "fresh") {
  throw new Error("voltage freshness must remain independent from connection state");
}
panel._hass = {
  locale: { language: "ru" },
  states: {
    "sensor.power": { state: "332", attributes: { unit_of_measurement: "W" } },
    "sensor.current": { state: "5", attributes: { unit_of_measurement: "A" } },
    "sensor.frequency": { state: "50", attributes: { unit_of_measurement: "Hz" } },
  },
};
if (panel._stateText("sensor.power") !== "332 Вт") {
  throw new Error("operational power unit must be localized to Вт");
}
if (panel._stateText("sensor.current") !== "5,0 А") {
  throw new Error("operational current unit must be localized to А");
}
if (panel._stateText("sensor.frequency") !== "50,0 Гц") {
  throw new Error("operational frequency unit must be localized to Гц");
}
if (panel._relatedAfterEntity("A", "current") !== null) {
  throw new Error("the frontend must not invent a related entity id absent from live state and Entity Registry");
}
const historyWithoutRelatedOutput = panel._historyCardConfigs({ hours: 24 });
if (historyWithoutRelatedOutput["after-current"] || historyWithoutRelatedOutput["after-power"]) {
  throw new Error("history must omit unverified post-LIDER current and power entities");
}
const diagnosticsTab = panel._tabButton("diagnostics", "mdi:stethoscope", "Диагн.", "Диагностика");
if (!diagnosticsTab.includes('aria-label="Диагностика"') || !diagnosticsTab.includes('<small>Диагн.</small>')) {
  throw new Error("compact diagnostics label must retain its full accessible name");
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
