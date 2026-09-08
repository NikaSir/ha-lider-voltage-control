import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const config = JSON.parse(fs.readFileSync(".nikas-ui-standard.json", "utf8"));
const source = fs.readFileSync(
  "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js",
  "utf8",
);

const refreshContract = config.refresh_action_feedback;
assert.equal(refreshContract?.version, "1.1");
assert.equal(refreshContract?.status, "required");
assert.equal(refreshContract?.minimum_visible_ms, 900);
assert.equal(refreshContract?.completion_feedback?.visible_ms, 1400);
assert.equal(refreshContract?.completion_feedback?.success_icon, "mdi:check");
assert.equal(refreshContract?.completion_feedback?.error_icon, "mdi:alert-circle-outline");

for (const marker of [
  "const REFRESH_MIN_VISIBLE_MS = 900",
  "const REFRESH_RESULT_VISIBLE_MS = 1_400",
  'this._hass.callService(\n      "homeassistant",\n      "update_entity"',
  'this._refreshButton.addEventListener("click", () => { void this._handleRefresh(); })',
  'aria-busy="false"',
  'role="status" aria-live="polite"',
  'icon: "mdi:check"',
  'icon: "mdi:alert-circle-outline"',
  ".refresh.refresh-busy ha-icon{animation:lider-refresh-spin 900ms linear infinite}",
  "@media (prefers-reduced-motion:reduce)",
]) {
  assert.ok(source.includes(marker), `refresh contract marker is missing: ${marker}`);
}

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, force) {
    if (force === undefined) force = !this.values.has(name);
    if (force) this.values.add(name);
    else this.values.delete(name);
    return force;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class EventNode {
  constructor() {
    this.attributes = new Map();
    this.classList = new ClassList();
    this.listeners = new Map();
    this.disabled = false;
    this.title = "";
    this.textContent = "";
    this.dataset = {};
    this.style = {};
  }

  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  emit(type, event = {}) {
    return this.listeners.get(type)?.(event);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  querySelector(selector) {
    return selector === "ha-icon" ? this.icon : null;
  }

  querySelectorAll() {
    return [];
  }

  scrollTo() {}
}

class HTMLElement extends EventNode {
  attachShadow() {
    this.shadowRoot = {};
    return this.shadowRoot;
  }

  dispatchEvent() {
    return true;
  }
}

const storage = new Map();
const session = new Map();
const timers = new Map();
let nextTimer = 1;
let Panel;
const context = {
  HTMLElement,
  customElements: {
    get: () => null,
    define: (_name, value) => { Panel = value; },
  },
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
    location: {
      href: "https://ha.local/dashboard-lider",
      origin: "https://ha.local",
      pathname: "/dashboard-lider",
      search: "",
      hash: "",
    },
    history: { pushState: () => {} },
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => session.set(key, value),
      removeItem: (key) => session.delete(key),
    },
  },
  document: { referrer: "" },
  URL,
  URLSearchParams,
  Event: class {},
  CustomEvent: class {},
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: (callback, delay) => {
    const id = nextTimer++;
    timers.set(id, { callback, delay });
    return id;
  },
  clearTimeout: (id) => timers.delete(id),
  console,
};

vm.createContext(context);
vm.runInContext(source, context);

function refreshButton() {
  const button = new EventNode();
  button.icon = new EventNode();
  button.setAttribute("aria-label", "Обновить");
  button.setAttribute("aria-busy", "false");
  button.icon.setAttribute("icon", "mdi:refresh");
  return button;
}

function makePanel({ callService, states } = {}) {
  const panel = new Panel();
  panel.isConnected = true;
  panel._mounted = true;
  panel._registryLoaded = true;
  panel._view = "overview";
  panel._refreshButton = refreshButton();
  panel._refreshStatus = new EventNode();
  panel._waitForRefreshMinimum = async () => {};
  panel._hass = {
    states: states ?? {
      "sensor.power_monitor_voltage_a": { state: "220", attributes: {} },
      "sensor.power_monitor_voltage_b": { state: "221", attributes: {} },
      "sensor.power_monitor_voltage_c": { state: "222", attributes: {} },
    },
    callService: callService ?? (async () => undefined),
  };
  return panel;
}

function assertState(panel, state) {
  assert.equal(panel._refreshState, state);
  assert.equal(panel._refreshButton.disabled, state === "busy");
  assert.equal(panel._refreshButton.getAttribute("aria-busy"), String(state === "busy"));
  const icon = state === "success"
    ? "mdi:check"
    : state === "error"
      ? "mdi:alert-circle-outline"
      : "mdi:refresh";
  assert.equal(panel._refreshButton.icon.getAttribute("icon"), icon);
}

function resultTimer(panel) {
  const timer = timers.get(panel._refreshResultTimer);
  assert.equal(timer?.delay, 1400);
  return timer;
}

function newestTimerSince(existingIds, predicate) {
  const match = [...timers.entries()]
    .filter(([id, timer]) => !existingIds.has(id) && predicate(timer))
    .at(-1);
  assert.ok(match, "expected refresh timer was not scheduled");
  return { id: match[0], ...match[1] };
}

// A fast request remains busy for the minimum interval instead of flashing.
const fast = makePanel();
delete fast._waitForRefreshMinimum;
const fastTimerIds = new Set(timers.keys());
const fastCycle = fast._handleRefresh();
await Promise.resolve();
assertState(fast, "busy");
const fastMinimum = newestTimerSince(
  fastTimerIds,
  (timer) => timer.delay > 0 && timer.delay <= 900,
);
assert.ok(fastMinimum.delay >= 850, `minimum busy delay is too short: ${fastMinimum.delay}`);
timers.delete(fastMinimum.id);
fastMinimum.callback();
assert.equal(await fastCycle, true);
assertState(fast, "success");

// A slow request stays busy after 900 ms and completes only when the request settles.
let releaseSlowTiming;
const slowTiming = makePanel({
  callService: async () => new Promise((resolve) => { releaseSlowTiming = resolve; }),
});
delete slowTiming._waitForRefreshMinimum;
const slowTimerIds = new Set(timers.keys());
const slowTimingCycle = slowTiming._handleRefresh();
const slowMinimum = newestTimerSince(
  slowTimerIds,
  (timer) => timer.delay > 0 && timer.delay <= 900,
);
timers.delete(slowMinimum.id);
slowMinimum.callback();
await Promise.resolve();
assertState(slowTiming, "busy");
releaseSlowTiming();
assert.equal(await slowTimingCycle, true);
assertState(slowTiming, "success");

// Production handler: accepted activation, exact service scope and duplicate guard.
let serviceCalls = 0;
let releaseService;
const slow = makePanel({
  callService: async (domain, service, data) => {
    serviceCalls += 1;
    assert.equal(domain, "homeassistant");
    assert.equal(service, "update_entity");
    assert.deepEqual(
      [...data.entity_id].sort(),
      [
        "sensor.power_monitor_voltage_a",
        "sensor.power_monitor_voltage_b",
        "sensor.power_monitor_voltage_c",
      ],
    );
    await new Promise((resolve) => { releaseService = resolve; });
  },
});
const slowCycle = slow._handleRefresh();
assertState(slow, "busy");
assert.equal(slow._refreshButton.getAttribute("aria-label"), "Обновление данных");
assert.equal(slow._handleRefresh(), slowCycle);
assert.equal(serviceCalls, 1);
releaseService();
assert.equal(await slowCycle, true);
assertState(slow, "success");
assert.equal(slow._refreshButton.getAttribute("aria-label"), "Запрос обновления выполнен");
resultTimer(slow).callback();
assertState(slow, "idle");

// False and rejected calls are failures, never optimistic success.
for (const callService of [async () => false, async () => { throw new Error("offline"); }]) {
  const failed = makePanel({ callService });
  assert.equal(await failed._handleRefresh(), false);
  assertState(failed, "error");
  assert.equal(failed._refreshStatus.textContent, "Не удалось обновить данные");
  assert.ok(failed._refreshStatus.classList.contains("visible"));
}

// No factual target is an explicit failure and dispatches no empty service call.
let emptyCalls = 0;
const empty = makePanel({ states: {}, callService: async () => { emptyCalls += 1; } });
assert.equal(await empty._handleRefresh(), false);
assertState(empty, "error");
assert.equal(emptyCalls, 0);

const missingService = makePanel();
missingService._hass.callService = null;
assert.equal(await missingService._handleRefresh(), false);
assertState(missingService, "error");

// History is a required subrequest on the Statistics tab; partial failure is red.
const partial = makePanel();
partial._view = "history";
partial._historyPeriod = "7d";
let historyReloads = 0;
partial._reloadHistoryPeriod = async (period) => {
  historyReloads += 1;
  assert.equal(period, "7d");
  return false;
};
assert.equal(await partial._handleRefresh(), false);
assertState(partial, "error");
assert.equal(historyReloads, 1);

// Refresh completion cannot fabricate a newer sample or healthy freshness.
const truthful = makePanel();
truthful._telemetrySnapshot = {
  updatedAt: 10,
  values: { "sensor.power_monitor_voltage_a": { state: "220", reportedAt: 10 } },
};
const beforeSnapshot = JSON.stringify(truthful._telemetrySnapshot);
assert.equal(await truthful._handleRefresh(), true);
assert.equal(JSON.stringify(truthful._telemetrySnapshot), beforeSnapshot);

// Refresh point-patches only its own mounted nodes and preserves user context.
const stable = makePanel();
stable._view = "after";
stable._historyPeriod = "30d";
stable._zoom = { scale: 1.5, x: -12, y: -34 };
stable._viewport = { scrollLeft: 7, scrollTop: 91 };
const stableButton = stable._refreshButton;
stable._renderContent = () => { throw new Error("refresh must not structurally render"); };
stable._queueLiveUpdate = () => { throw new Error("refresh must not fake a telemetry update"); };
assert.equal(await stable._handleRefresh(), true);
assert.equal(stable._refreshButton, stableButton);
assert.equal(stable._view, "after");
assert.equal(stable._historyPeriod, "30d");
assert.deepEqual(stable._zoom, { scale: 1.5, x: -12, y: -34 });
assert.deepEqual(
  { scrollLeft: stable._viewport.scrollLeft, scrollTop: stable._viewport.scrollTop },
  { scrollLeft: 7, scrollTop: 91 },
);

// Retry during the result interval invalidates the old timer and keeps one new request.
let retryCalls = 0;
let releaseRetry;
const retry = makePanel({
  callService: async () => {
    retryCalls += 1;
    if (retryCalls === 2) await new Promise((resolve) => { releaseRetry = resolve; });
  },
});
await retry._handleRefresh();
const oldTimer = resultTimer(retry);
const retryCycle = retry._handleRefresh();
assertState(retry, "busy");
oldTimer.callback();
assertState(retry, "busy");
releaseRetry();
assert.equal(await retryCycle, true);
assert.equal(retryCalls, 2);

// The mounted production button is wired to the guarded handler.
const wired = new Panel();
wired.isConnected = true;
wired._hass = {
  states: { "sensor.power_monitor_voltage_a": { state: "220", attributes: {} } },
  callService: async () => undefined,
};
wired._waitForRefreshMinimum = async () => {};
wired._renderContent = () => {};
const nodes = Object.fromEntries(
  [".viewport", ".canvas", ".zoom-toast", ".menu", ".refresh", ".title-return", ".tabs", ".refresh-feedback"]
    .map((selector) => [selector, selector === ".refresh" ? refreshButton() : new EventNode()]),
);
wired.shadowRoot = {
  innerHTML: "",
  querySelector: (selector) => nodes[selector] ?? null,
  querySelectorAll: () => [],
};
let wiredCalls = 0;
wired._hass.callService = async () => { wiredCalls += 1; };
wired._mount();
nodes[".refresh"].emit("click");
assertState(wired, "busy");
assert.equal(await wired._refreshPromise, true);
assert.equal(wiredCalls, 1);

// Removal clears result timers and late completion cannot patch the detached panel.
const detached = makePanel();
await detached._handleRefresh();
const detachedTimer = resultTimer(detached);
const detachedToken = detached._refreshRequestToken;
detached.isConnected = false;
detached.disconnectedCallback();
assert.equal(detached._refreshRequestToken, detachedToken + 1);
assert.equal(detached._refreshResultTimer, null);
assertState(detached, "idle");
detachedTimer.callback();
assertState(detached, "idle");

console.log("Production refresh action contract verified");
