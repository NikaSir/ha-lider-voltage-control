const LIDER_UI_VERSION = "0.9.0";
const PANEL_TITLE = "Электросеть";
const RETURN_ROUTE_KEY = "nikas.lider.return_route.v2";
const SOURCE_ROUTE_KEY = "nikas.specialized.source_route.v1";
const SAFE_RETURN_ROUTE = "/dashboard-infrastructure/overview";
const ALLOWED_RETURN_ROOTS = ["/dashboard-house-v11", "/dashboard-actions", "/dashboard-infrastructure"];
const HISTORY_TIMEOUT_MS = 60_000;
const HISTORY_CONCURRENCY = 2;
const HISTORY_MAX_POINTS = 360;

const ENTITY = Object.freeze({
  before: Object.freeze({
    voltage: ["sensor.power_monitor_voltage_a", "sensor.power_monitor_voltage_b", "sensor.power_monitor_voltage_c"],
    current: ["sensor.power_monitor_current_a", "sensor.power_monitor_current_b", "sensor.power_monitor_current_c"],
    power: ["sensor.power_monitor_power_a", "sensor.power_monitor_power_b", "sensor.power_monitor_power_c"],
    totalPower: "sensor.power_monitor_power",
    frequency: "sensor.power_monitor_ac_frequency",
    imbalance: "sensor.power_monitor_voltage_imbalance",
    online: "binary_sensor.power_meter_online",
    phaseLoss: "binary_sensor.power_phase_loss",
  }),
  after: Object.freeze({
    voltage: ["sensor.socket_zb_2_voltage", "sensor.socket_zb_3_voltage", "sensor.socket_zb_31_voltage"],
  }),
});

const TABS = Object.freeze([
  ["overview", "mdi:home-lightning-bolt", "Обзор", "Обзор"],
  ["before", "mdi:transmission-tower-import", "До", "До стабилизаторов"],
  ["after", "mdi:transmission-tower-export", "После", "После стабилизаторов"],
  ["history", "mdi:chart-line", "История", "История"],
  ["diagnostics", "mdi:stethoscope", "Диагн.", "Диагностика"],
]);

const HISTORY_PERIODS = Object.freeze({
  "24h": { label: "24 ч", hours: 24 },
  "7d": { label: "7 дней", hours: 168 },
  "30d": { label: "30 дней", hours: 720 },
  "12m": { label: "12 мес", hours: 8760 },
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isUnavailable(stateObj) {
  return !stateObj || stateObj.state === "unknown" || stateObj.state === "unavailable" || stateObj.state === "";
}

function numericState(stateObj) {
  if (isUnavailable(stateObj)) return null;
  const value = Number(stateObj.state);
  return Number.isFinite(value) ? value : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

class DataAdapter {
  constructor() {
    this.hass = null;
    this.entityRegistry = null;
    this.deviceRegistry = null;
    this.registryPromise = null;
    this.lineEntity = null;
  }

  setHass(hass) {
    this.hass = hass;
  }

  state(entityId) {
    return entityId ? this.hass?.states?.[entityId] ?? null : null;
  }

  value(entityId) {
    return numericState(this.state(entityId));
  }

  unit(entityId) {
    const raw = this.state(entityId)?.attributes?.unit_of_measurement ?? "";
    return ({ V: "В", A: "А", W: "Вт", Hz: "Гц" })[raw] ?? raw;
  }

  text(entityId, digits = 1) {
    const value = this.value(entityId);
    if (value === null) return "Нет данных";
    const unit = this.unit(entityId);
    const formatted = new Intl.NumberFormat(this.hass?.locale?.language || "ru", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);
    return `${formatted}${unit ? ` ${unit}` : ""}`;
  }

  phaseQuality(value, before = false) {
    if (value === null) return "unavailable";
    if (before) {
      if (value < 125 || value > 275) return "emergency";
      if (value < 135 || value > 265) return "significant";
      if (value < 150) return "attention";
      return "normal";
    }
    if (value < 198 || value > 242) return "emergency";
    if (value < 205 || value > 235) return "significant";
    if (value < 210 || value > 230) return "attention";
    return "normal";
  }

  groupQuality(entityIds, before = false) {
    const qualities = entityIds.map((id) => this.phaseQuality(this.value(id), before));
    for (const level of ["emergency", "significant", "attention", "unavailable", "normal"]) {
      if (qualities.includes(level)) return level;
    }
    return "unavailable";
  }

  connectionStatus() {
    const state = this.state(ENTITY.before.online);
    const transport = !state || isUnavailable(state) ? "Нет данных" : state.state === "on" ? "Локально" : "Нет связи";
    const timestamps = ENTITY.before.voltage.map((id) => this.state(id)?.last_updated).filter(Boolean);
    const newest = timestamps.map(Date.parse).filter(Number.isFinite).sort((a, b) => b - a)[0];
    let freshness = "Нет данных";
    if (newest) freshness = Date.now() - newest > 90_000 ? "Данные устарели" : "Данные актуальны";
    return { transport, freshness };
  }

  async ensureRegistries() {
    if (this.registryPromise) return this.registryPromise;
    if (typeof this.hass?.callWS !== "function") return null;
    this.registryPromise = Promise.all([
      this.hass.callWS({ type: "config/entity_registry/list" }),
      this.hass.callWS({ type: "config/device_registry/list" }),
    ]).then(([entities, devices]) => {
      this.entityRegistry = Array.isArray(entities) ? entities : [];
      this.deviceRegistry = Array.isArray(devices) ? devices : [];
      this._resolveNonInterruptibleLine();
      return true;
    }).catch(() => null);
    return this.registryPromise;
  }

  _resolveNonInterruptibleLine() {
    const match = this.entityRegistry?.find((entry) => entry.unique_id === "W0035313411160_input_voltage");
    this.lineEntity = match?.entity_id && this.hass?.states?.[match.entity_id] ? match.entity_id : null;
  }

  diagnosticsEntities() {
    const fixed = new Set([
      ...ENTITY.before.voltage,
      ...ENTITY.before.current,
      ...ENTITY.before.power,
      ENTITY.before.totalPower,
      ENTITY.before.frequency,
      ENTITY.before.imbalance,
      ENTITY.before.online,
      ENTITY.before.phaseLoss,
      ...ENTITY.after.voltage,
      this.lineEntity,
    ].filter(Boolean));
    if (!this.entityRegistry?.length) return [...fixed].sort();
    const boundDeviceIds = new Set();
    for (const entry of this.entityRegistry) if (fixed.has(entry.entity_id) && entry.device_id) boundDeviceIds.add(entry.device_id);
    for (const entry of this.entityRegistry) {
      if (!entry.disabled_by && entry.device_id && boundDeviceIds.has(entry.device_id) && this.hass?.states?.[entry.entity_id]) {
        fixed.add(entry.entity_id);
      }
    }
    return [...fixed].sort();
  }
}

class HistoryStore {
  constructor(adapter, onUpdate) {
    this.adapter = adapter;
    this.onUpdate = onUpdate;
    this.loads = new Map();
  }

  clear(periodKey) {
    if (periodKey) this.loads.delete(periodKey);
    else this.loads.clear();
  }

  load(periodKey, configs) {
    const existing = this.loads.get(periodKey);
    if (existing) return existing;
    const period = HISTORY_PERIODS[periodKey];
    const end = new Date();
    const start = new Date(end.getTime() - period.hours * 3_600_000);
    const entries = Object.entries(configs);
    const load = {
      key: periodKey,
      start,
      end,
      status: "loading",
      cards: Object.fromEntries(entries.map(([id]) => [id, { status: "pending", series: {} }])),
      promise: null,
    };
    let cursor = 0;
    const worker = async () => {
      while (cursor < entries.length) {
        const [id, config] = entries[cursor++];
        const card = load.cards[id];
        card.status = "loading";
        this.onUpdate(load);
        try {
          const ids = [...new Set(config.entities.map((item) => item.entity).filter(Boolean))];
          if (!ids.length) throw new Error("no entities");
          const path = this._apiPath(start, end, ids);
          const raw = await this._request(path);
          card.series = this._series(raw);
          card.status = "ready";
        } catch (error) {
          card.status = "error";
          card.error = error instanceof Error ? error.message : String(error);
        }
        this.onUpdate(load);
      }
    };
    const workers = Math.min(HISTORY_CONCURRENCY, entries.length);
    load.promise = Promise.all(Array.from({ length: workers }, worker)).then(() => {
      load.status = "complete";
      this.onUpdate(load);
      return load;
    });
    this.loads.set(periodKey, load);
    return load;
  }

  async _request(path) {
    if (typeof this.adapter.hass?.callApi !== "function") throw new Error("Recorder API unavailable");
    let timer = null;
    try {
      return await Promise.race([
        this.adapter.hass.callApi("get", path),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Recorder timeout")), HISTORY_TIMEOUT_MS); }),
      ]);
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }

  _apiPath(start, end, ids) {
    return "history/period/" + encodeURIComponent(start.toISOString()) +
      "?end_time=" + encodeURIComponent(end.toISOString()) +
      "&filter_entity_id=" + encodeURIComponent(ids.join(",")) +
      "&minimal_response&no_attributes&significant_changes_only";
  }

  _series(history) {
    const result = {};
    for (const rawSeries of Array.isArray(history) ? history : []) {
      if (!Array.isArray(rawSeries) || !rawSeries.length) continue;
      const entityId = rawSeries.find((entry) => entry?.entity_id)?.entity_id;
      if (!entityId) continue;
      result[entityId] = rawSeries.map((entry) => ({
        time: Date.parse(entry?.last_changed || entry?.last_updated || ""),
        value: Number(entry?.state),
      })).filter((item) => Number.isFinite(item.time) && Number.isFinite(item.value));
    }
    return result;
  }

  sample(points) {
    if (points.length <= HISTORY_MAX_POINTS) return points;
    const sampled = [];
    for (let i = 0; i < HISTORY_MAX_POINTS; i += 1) {
      sampled.push(points[Math.round(i * (points.length - 1) / (HISTORY_MAX_POINTS - 1))]);
    }
    return sampled;
  }
}

class ViewStore {
  constructor(panel) {
    this.panel = panel;
    this.cache = new Map();
  }

  get(name) {
    if (!this.cache.has(name)) this.cache.set(name, this.panel._createView(name));
    return this.cache.get(name);
  }
}

class LiderVoltageControlPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
    this._mounted = false;
    this._frame = 0;
    this._activeTab = "overview";
    this._historyPeriod = "24h";
    this._adapter = new DataAdapter();
    this._views = new ViewStore(this);
    this._history = new HistoryStore(this._adapter, () => this._schedulePatch());
    this._returnRoute = SAFE_RETURN_ROUTE;
    this._zoom = { scale: 1, x: 0, y: 0 };
    this._gesture = { active: false, startDistance: 0, startScale: 1, midpoint: null, lastTwoTap: 0 };
  }

  set hass(value) {
    this._hass = value;
    this._adapter.setHass(value);
    if (!this._mounted) this._mount();
    this._schedulePatch();
    if (!this._adapter.registryPromise) {
      this._adapter.ensureRegistries().then(() => this._schedulePatch());
    }
  }

  get hass() { return this._hass; }

  set panel(value) { this._config = value?.config ?? value ?? null; }

  connectedCallback() {
    if (this._hass && !this._mounted) this._mount();
  }

  disconnectedCallback() {
    if (this._frame) cancelAnimationFrame(this._frame);
    this._frame = 0;
  }

  _mount() {
    this._mounted = true;
    this._captureReturnRoute();
    this.shadowRoot.innerHTML = `<style>${this._styles()}</style>${this._shellHtml()}`;
    this._viewport = this.shadowRoot.querySelector(".work-viewport");
    this._canvas = this.shadowRoot.querySelector(".work-canvas");
    this._bindShell();
    this._selectTab(this._activeTab, false);
  }

  _shellHtml() {
    const tabs = TABS.map(([id, icon, label, aria]) => this._tabButton(id, icon, label, aria)).join("");
    return `
      <div class="app-shell">
        <header class="header">
          <button class="header-action menu" type="button" aria-label="Меню Home Assistant"><ha-icon icon="mdi:menu"></ha-icon></button>
          <button class="title-plaque" type="button" aria-label="Вернуться в исходную панель NikaS">
            <span>${PANEL_TITLE}</span><small>UI v${LIDER_UI_VERSION}</small>
          </button>
          <button class="header-action refresh" type="button" aria-label="Обновить"><ha-icon icon="mdi:refresh"></ha-icon></button>
        </header>
        <main class="work-viewport" tabindex="-1"><div class="work-canvas"></div></main>
        <nav class="bottom-bar" aria-label="Разделы панели">${tabs}</nav>
        <div class="zoom-toast" role="status" aria-live="polite">Масштаб 100%</div>
      </div>`;
  }

  _tabButton(id, icon, label, aria) {
    return `<button class="tab" type="button" data-tab="${id}" aria-label="${aria}"><ha-icon icon="${icon}"></ha-icon><span>${label}</span></button>`;
  }

  _bindShell() {
    this.shadowRoot.querySelector(".menu").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
    });
    this.shadowRoot.querySelector(".title-plaque").addEventListener("click", () => this._navigateHome());
    this.shadowRoot.querySelector(".refresh").addEventListener("click", () => this._refreshActive());
    this.shadowRoot.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => this._selectTab(button.dataset.tab)));
    this._viewport.addEventListener("touchstart", (event) => this._onTouchStart(event), { passive: false });
    this._viewport.addEventListener("touchmove", (event) => this._onTouchMove(event), { passive: false });
    this._viewport.addEventListener("touchend", (event) => this._onTouchEnd(event), { passive: false });
    this._viewport.addEventListener("touchcancel", (event) => this._onTouchEnd(event), { passive: false });
  }

  _schedulePatch() {
    if (!this._mounted || this._frame) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = 0;
      this._patchActiveView();
    });
  }

  _selectTab(name, focus = true) {
    if (!TABS.some(([id]) => id === name)) name = "overview";
    const old = this._canvas.firstElementChild;
    const view = this._views.get(name);
    if (old !== view) this._canvas.replaceChildren(view);
    this._activeTab = name;
    this._viewport.scrollTo({ top: 0, left: 0, behavior: "instant" });
    this._clampTransform(true);
    this.shadowRoot.querySelectorAll(".tab").forEach((button) => {
      const active = button.dataset.tab === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    this._patchActiveView();
    if (focus) this._viewport.focus({ preventScroll: true });
  }

  _createView(name) {
    const root = document.createElement("section");
    root.className = `view view-${name}`;
    root.dataset.view = name;
    if (name === "overview") root.innerHTML = this._overviewTemplate();
    if (name === "before") root.innerHTML = this._phaseTemplate("До стабилизаторов", true);
    if (name === "after") root.innerHTML = this._phaseTemplate("После стабилизаторов", false);
    if (name === "history") {
      root.innerHTML = this._historyTemplate();
      root.querySelectorAll("[data-period]").forEach((button) => button.addEventListener("click", () => {
        if (button.dataset.period === this._historyPeriod) return;
        this._historyPeriod = button.dataset.period;
        this._patchHistory(root);
      }));
    }
    if (name === "diagnostics") root.innerHTML = this._diagnosticsTemplate();
    return root;
  }

  _overviewTemplate() {
    return `
      <div class="overview-grid">
        <section class="status-row">
          <div class="connection-plaque" data-role="connection"><span class="lamp"></span><div><strong data-field="transport">Нет данных</strong><small data-field="freshness">Нет данных</small></div></div>
          <div class="flow-plaque"><strong>Сеть → LIDER → дом</strong><small>Контроль качества электросети</small></div>
        </section>
        <section class="installation panel-card">
          <img class="room-bg" src="/lider_voltage_control_panel/assets/lider-room-background-v1.webp" alt="" decoding="async" fetchpriority="high">
          <img class="rack" src="/lider_voltage_control_panel/assets/lider-rack-ps22w30-v2.webp" alt="Стойка с тремя стабилизаторами LIDER PS-7500W-30" decoding="async" fetchpriority="high">
          <div class="scene-label before"><span>До стабилизаторов</span><strong data-field="before-summary">Нет данных</strong></div>
          <div class="scene-label after"><span>После стабилизаторов</span><strong data-field="after-summary">Нет данных</strong></div>
        </section>
        <section class="phase-strip panel-card" data-role="overview-phases">
          ${[0,1,2].map((i) => `<article class="phase-mini" data-phase="${i}"><b>${["L1","L2","L3"][i]}</b><span data-field="before-v">—</span><span data-field="after-v">—</span></article>`).join("")}
        </section>
        <section class="overview-bottom panel-card">
          <div><span>Мощность</span><strong data-field="total-power">Нет данных</strong></div>
          <div><span>Частота</span><strong data-field="frequency">Нет данных</strong></div>
          <div><span>Неотключаемая линия</span><strong data-field="line-voltage">Нет данных</strong></div>
        </section>
      </div>`;
  }

  _phaseTemplate(title, before) {
    const rows = [0,1,2].map((i) => `
      <article class="phase-card" data-phase="${i}">
        <div class="phase-head"><span class="quality-dot"></span><strong>${["L1","L2","L3"][i]}</strong><small>${title}</small></div>
        <div class="metric-grid">
          <div><span>Напряжение</span><b data-field="voltage">Нет данных</b></div>
          ${before ? `<div><span>Ток</span><b data-field="current">Нет данных</b></div><div><span>Мощность</span><b data-field="power">Нет данных</b></div>` : ""}
        </div>
      </article>`).join("");
    return `<div class="page-stack"><header class="section-title"><h2>${title}</h2><p>${before ? "Ввод электросети до стабилизаторов" : "Контрольные точки после стабилизаторов"}</p></header>${rows}</div>`;
  }

  _historyTemplate() {
    return `<div class="page-stack history-page">
      <div class="periods">${Object.entries(HISTORY_PERIODS).map(([key, value]) => `<button type="button" data-period="${key}">${value.label}</button>`).join("")}</div>
      <section class="panel-card history-group"><h2>До стабилизаторов</h2>${this._historyHosts(["before-voltage","before-current","before-power"])}</section>
      <section class="panel-card history-group"><h2>После стабилизаторов</h2>${this._historyHosts(["after-voltage"])}</section>
      <section class="panel-card history-group"><h2>Неотключаемая линия</h2>${this._historyHosts(["line-voltage"])}</section>
      <p class="note">Recorder загружается по графикам; готовые графики отображаются независимо.</p>
    </div>`;
  }

  _historyHosts(ids) {
    return ids.map((id) => `<div class="history-host" data-history="${id}"><div class="history-state">Загрузка истории…</div></div>`).join("");
  }

  _diagnosticsTemplate() {
    return `<div class="page-stack diagnostics-page"><header class="section-title"><h2>Диагностика</h2><p>Фактические состояния и атрибуты задействованных устройств</p></header><div class="diagnostics-list" data-role="diagnostics"><div class="panel-card empty">Загрузка реестра…</div></div></div>`;
  }

  _patchActiveView() {
    const root = this._canvas.firstElementChild;
    if (!root) return;
    if (this._activeTab === "overview") this._patchOverview(root);
    if (this._activeTab === "before") this._patchPhaseView(root, true);
    if (this._activeTab === "after") this._patchPhaseView(root, false);
    if (this._activeTab === "history") this._patchHistory(root);
    if (this._activeTab === "diagnostics") this._patchDiagnostics(root);
  }

  _patchOverview(root) {
    const status = this._adapter.connectionStatus();
    this._setText(root, "[data-field=transport]", status.transport);
    this._setText(root, "[data-field=freshness]", status.freshness);
    const plaque = root.querySelector("[data-role=connection]");
    if (plaque) plaque.dataset.state = status.transport === "Локально" ? "normal" : status.transport === "Нет связи" ? "emergency" : "unavailable";
    const beforeQuality = this._adapter.groupQuality(ENTITY.before.voltage, true);
    const afterQuality = this._adapter.groupQuality(ENTITY.after.voltage, false);
    this._setText(root, "[data-field=before-summary]", this._qualityLabel(beforeQuality));
    this._setText(root, "[data-field=after-summary]", this._qualityLabel(afterQuality));
    root.querySelector(".scene-label.before")?.setAttribute("data-state", beforeQuality);
    root.querySelector(".scene-label.after")?.setAttribute("data-state", afterQuality);
    root.querySelectorAll(".phase-mini").forEach((card, i) => {
      this._setText(card, "[data-field=before-v]", this._adapter.text(ENTITY.before.voltage[i], 0));
      this._setText(card, "[data-field=after-v]", this._adapter.text(ENTITY.after.voltage[i], 0));
      card.dataset.state = this._adapter.phaseQuality(this._adapter.value(ENTITY.after.voltage[i]), false);
    });
    this._setText(root, "[data-field=total-power]", this._adapter.text(ENTITY.before.totalPower, 0));
    this._setText(root, "[data-field=frequency]", this._adapter.text(ENTITY.before.frequency, 1));
    this._setText(root, "[data-field=line-voltage]", this._adapter.lineEntity ? this._adapter.text(this._adapter.lineEntity, 0) : "Нет данных");
  }

  _patchPhaseView(root, before) {
    const voltageIds = before ? ENTITY.before.voltage : ENTITY.after.voltage;
    root.querySelectorAll(".phase-card").forEach((card, i) => {
      const voltage = this._adapter.value(voltageIds[i]);
      card.dataset.state = this._adapter.phaseQuality(voltage, before);
      this._setText(card, "[data-field=voltage]", this._adapter.text(voltageIds[i], 1));
      if (before) {
        this._setText(card, "[data-field=current]", this._adapter.text(ENTITY.before.current[i], 2));
        this._setText(card, "[data-field=power]", this._adapter.text(ENTITY.before.power[i], 0));
      }
    });
  }

  _historyConfigs() {
    const line = this._adapter.lineEntity;
    return {
      "before-voltage": { title: "Напряжение", entities: ENTITY.before.voltage.map((entity, i) => ({ entity, name: ["L1","L2","L3"][i] })) },
      "before-current": { title: "Ток", entities: ENTITY.before.current.map((entity, i) => ({ entity, name: ["L1","L2","L3"][i] })) },
      "before-power": { title: "Мощность", entities: ENTITY.before.power.map((entity, i) => ({ entity, name: ["L1","L2","L3"][i] })) },
      "after-voltage": { title: "Напряжение", entities: ENTITY.after.voltage.map((entity, i) => ({ entity, name: ["L1","L2","L3"][i] })) },
      "line-voltage": { title: "Напряжение", entities: line ? [{ entity: line, name: "Неотключаемая" }] : [] },
    };
  }

  _patchHistory(root) {
    root.querySelectorAll("[data-period]").forEach((button) => button.classList.toggle("active", button.dataset.period === this._historyPeriod));
    const configs = this._historyConfigs();
    const load = this._history.load(this._historyPeriod, configs);
    for (const [id, config] of Object.entries(configs)) {
      const host = root.querySelector(`[data-history="${id}"]`);
      if (!host) continue;
      const card = load.cards[id];
      if (!card || card.status === "pending" || card.status === "loading") {
        this._replaceStable(host, `<div class="history-state">Загрузка истории…</div>`, "loading");
      } else if (card.status === "error") {
        this._replaceStable(host, `<div class="history-state error">История Recorder недоступна</div>`, "error");
      } else {
        this._replaceStable(host, this._historyGraphHtml(config, card.series, load.start, load.end), "ready");
      }
    }
  }

  _replaceStable(host, html, key) {
    if (host.dataset.renderKey === key && key !== "ready") return;
    const template = document.createElement("template");
    template.innerHTML = html;
    host.replaceChildren(template.content.cloneNode(true));
    host.dataset.renderKey = key;
  }

  _historyGraphHtml(config, seriesByEntity, start, end) {
    const colors = ["#039bc5", "#ed8b00", "#7656c9"];
    const series = config.entities.map((entry, index) => ({
      ...entry,
      color: colors[index % colors.length],
      points: this._history.sample(seriesByEntity[entry.entity] || []),
    })).filter((entry) => entry.points.length);
    const values = series.flatMap((entry) => entry.points.map((point) => point.value));
    if (!values.length) return `<article class="history-card"><h3>${escapeHtml(config.title)}</h3><div class="history-state">Нет записей за выбранный период</div></article>`;
    let min = Math.min(...values), max = Math.max(...values);
    const pad = max === min ? Math.max(Math.abs(max) * .03, 1) : (max - min) * .08;
    min -= pad; max += pad;
    const tSpan = Math.max(1, end.getTime() - start.getTime());
    const vSpan = Math.max(1e-9, max - min);
    const lines = series.map((entry) => {
      const points = entry.points.map((point) => {
        const x = 34 + clamp((point.time - start.getTime()) / tSpan, 0, 1) * 582;
        const y = 18 + (1 - (point.value - min) / vSpan) * 146;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${entry.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline>`;
    }).join("");
    const legend = series.map((entry) => `<span><i style="--c:${entry.color}"></i>${escapeHtml(entry.name)}</span>`).join("");
    return `<article class="history-card"><div class="history-head"><h3>${escapeHtml(config.title)}</h3><small>${this._dateLabel(start)} — ${this._dateLabel(end)}</small></div><svg viewBox="0 0 640 182" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(config.title)}"><line x1="34" y1="18" x2="616" y2="18" class="grid-line"></line><line x1="34" y1="91" x2="616" y2="91" class="grid-line"></line><line x1="34" y1="164" x2="616" y2="164" class="grid-line"></line>${lines}</svg><div class="legend">${legend}</div></article>`;
  }

  _dateLabel(date) {
    return new Intl.DateTimeFormat(this._hass?.locale?.language || "ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  _patchDiagnostics(root) {
    const host = root.querySelector("[data-role=diagnostics]");
    if (!host) return;
    const ids = this._adapter.diagnosticsEntities();
    const signature = ids.map((id) => `${id}:${this._hass?.states?.[id]?.last_updated || ""}`).join("|");
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    if (!ids.length) {
      host.innerHTML = `<div class="panel-card empty">Нет доступных диагностических сущностей</div>`;
      return;
    }
    host.innerHTML = ids.map((id) => this._diagnosticCard(id)).join("");
    host.querySelectorAll("[data-entity]").forEach((card) => card.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: card.dataset.entity }, bubbles: true, composed: true }));
    }));
  }

  _diagnosticCard(id) {
    const state = this._hass?.states?.[id];
    if (!state) return "";
    const attrs = Object.entries(state.attributes || {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `<div><span>${escapeHtml(key)}</span><b>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</b></div>`).join("");
    return `<article class="diagnostic-card panel-card" tabindex="0" role="button" data-entity="${escapeHtml(id)}"><header><strong>${escapeHtml(state.attributes?.friendly_name || id)}</strong><small>${escapeHtml(id)}</small></header><div class="diag-state"><span>state</span><b>${escapeHtml(state.state)}</b></div><div class="diag-attrs">${attrs}</div><footer><span>changed ${escapeHtml(state.last_changed || "—")}</span><span>updated ${escapeHtml(state.last_updated || "—")}</span></footer></article>`;
  }

  _setText(root, selector, value) {
    const node = root.querySelector(selector);
    const text = String(value ?? "");
    if (node && node.textContent !== text) node.textContent = text;
  }

  _qualityLabel(state) {
    return ({ normal: "Норма", attention: "Внимание", significant: "Отклонение", emergency: "Авария", unavailable: "Нет данных" })[state] || "Нет данных";
  }

  _refreshActive() {
    if (this._activeTab === "history") this._history.clear(this._historyPeriod);
    if (this._activeTab === "diagnostics") {
      this._adapter.registryPromise = null;
      this._adapter.ensureRegistries().then(() => this._schedulePatch());
    }
    this._schedulePatch();
  }

  _captureReturnRoute() {
    const params = new URLSearchParams(location.search);
    const candidates = [params.get("return_to"), params.get("from")];
    try {
      const handoff = sessionStorage.getItem(SOURCE_ROUTE_KEY);
      if (handoff) candidates.push(handoff);
    } catch (_) {}
    try { candidates.push(localStorage.getItem(RETURN_ROUTE_KEY)); } catch (_) {}
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        if (ref.origin === location.origin) candidates.push(ref.pathname + ref.search);
      }
    } catch (_) {}
    candidates.push(this._config?.parent_route, SAFE_RETURN_ROUTE);
    const accepted = candidates.map((route) => this._validReturnRoute(route)).find(Boolean) || SAFE_RETURN_ROUTE;
    this._returnRoute = accepted;
    try { localStorage.setItem(RETURN_ROUTE_KEY, accepted); } catch (_) {}
    try { sessionStorage.removeItem(SOURCE_ROUTE_KEY); } catch (_) {}
  }

  _validReturnRoute(route) {
    if (!route || typeof route !== "string") return null;
    try {
      const url = new URL(route, location.origin);
      if (url.origin !== location.origin) return null;
      return ALLOWED_RETURN_ROOTS.some((root) => url.pathname === root || url.pathname.startsWith(`${root}/`)) ? `${url.pathname}${url.search}${url.hash}` : null;
    } catch (_) { return null; }
  }

  _navigateHome() {
    history.pushState(null, "", this._returnRoute || SAFE_RETURN_ROUTE);
    window.dispatchEvent(new Event("location-changed"));
  }

  _touchDistance(touches) {
    const [a, b] = touches;
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  _touchMidpoint(touches) {
    const [a, b] = touches;
    const rect = this._viewport.getBoundingClientRect();
    return { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
  }

  _onTouchStart(event) {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const now = performance.now();
    if (now - this._gesture.lastTwoTap < 360) {
      this._resetZoom(true);
      this._gesture.lastTwoTap = 0;
      return;
    }
    this._gesture.lastTwoTap = now;
    this._gesture.active = true;
    this._gesture.startDistance = this._touchDistance(event.touches);
    this._gesture.startScale = this._zoom.scale;
    this._gesture.midpoint = this._touchMidpoint(event.touches);
  }

  _onTouchMove(event) {
    if (!this._gesture.active || event.touches.length !== 2) return;
    event.preventDefault();
    const distance = this._touchDistance(event.touches);
    if (!this._gesture.startDistance) return;
    const nextScale = clamp(this._gesture.startScale * distance / this._gesture.startDistance, .75, 2);
    const mid = this._touchMidpoint(event.touches);
    const prev = this._zoom.scale;
    const ratio = nextScale / prev;
    this._zoom.x = mid.x - (mid.x - this._zoom.x) * ratio;
    this._zoom.y = mid.y - (mid.y - this._zoom.y) * ratio;
    this._zoom.scale = nextScale;
    this._applyTransform();
  }

  _onTouchEnd(event) {
    if (!this._gesture.active) return;
    if (event.touches.length > 0) return;
    this._gesture.active = false;
    if (this._zoom.scale >= .97 && this._zoom.scale <= 1.03) this._resetZoom(false);
    else this._clampTransform(false);
  }

  _applyTransform() {
    this._canvas.style.transformOrigin = "0 0";
    this._canvas.style.transform = `translate3d(${this._zoom.x}px,${this._zoom.y}px,0) scale(${this._zoom.scale})`;
  }

  _clampTransform(forceOrigin) {
    if (forceOrigin || this._zoom.scale <= 1) {
      this._zoom.scale = forceOrigin ? this._zoom.scale : Math.max(1, this._zoom.scale);
      this._zoom.x = 0; this._zoom.y = 0;
      this._applyTransform();
      return;
    }
    const viewport = this._viewport.getBoundingClientRect();
    const width = this._canvas.scrollWidth * this._zoom.scale;
    const height = this._canvas.scrollHeight * this._zoom.scale;
    this._zoom.x = clamp(this._zoom.x, Math.min(0, viewport.width - width), 0);
    this._zoom.y = clamp(this._zoom.y, Math.min(0, viewport.height - height), 0);
    this._applyTransform();
  }

  _resetZoom(showToast) {
    this._zoom = { scale: 1, x: 0, y: 0 };
    this._viewport.scrollTo({ top: 0, left: 0, behavior: "instant" });
    this._applyTransform();
    if (showToast) {
      const toast = this.shadowRoot.querySelector(".zoom-toast");
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 900);
    }
  }

  _styles() {
    return `
      :host{display:block;height:100%;min-height:0;background:var(--primary-background-color);color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif);overflow:hidden;--ok:#2e9d62;--warn:#d88a14;--bad:#c74848;--muted:var(--secondary-text-color,#6c7480)}
      *{box-sizing:border-box}button{font:inherit;color:inherit}.app-shell{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;background:var(--primary-background-color)}
      .header{min-height:calc(60px + env(safe-area-inset-top));padding:calc(env(safe-area-inset-top) + 7px) max(10px,env(safe-area-inset-right)) 7px max(10px,env(safe-area-inset-left));display:grid;grid-template-columns:52px minmax(0,1fr) 52px;gap:8px;align-items:center;background:var(--primary-background-color);z-index:5}
      .header-action,.title-plaque{border:1px solid color-mix(in srgb,var(--primary-color,#03a9d9) 24%,var(--divider-color,#dfe3e8));background:color-mix(in srgb,var(--primary-color,#03a9d9) 5%,var(--card-background-color,#fff));box-shadow:0 5px 16px rgba(23,45,76,.06)}
      .header-action{width:44px;height:44px;border-radius:16px;display:grid;place-items:center;padding:0}.header-action ha-icon{--mdc-icon-size:25px}.refresh{color:var(--primary-color)}
      .title-plaque{justify-self:center;min-width:min(290px,100%);max-width:100%;min-height:44px;padding:5px 14px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;overflow:hidden}.title-plaque span{font-size:23px;font-weight:800;white-space:nowrap}.title-plaque small{font-size:14px;font-weight:560;color:var(--secondary-text-color);margin-top:3px}.title-plaque:active{background:color-mix(in srgb,var(--primary-color) 13%,var(--card-background-color));transform:scale(.985)}.title-plaque:focus-visible,.header-action:focus-visible,.tab:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
      .work-viewport{min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y;background:var(--primary-background-color);scrollbar-gutter:stable both-edges}.work-canvas{width:100%;min-height:100%;padding:8px 10px 18px;transform-origin:0 0;will-change:transform}.view{width:100%;min-height:100%}
      .bottom-bar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:6px max(6px,env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left));border-top:1px solid var(--divider-color);background:var(--card-background-color);box-shadow:0 -5px 16px rgba(23,45,76,.06);z-index:5}.tab{min-height:52px;border:0;border-radius:16px;background:transparent;color:var(--secondary-text-color);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px 2px}.tab ha-icon{--mdc-icon-size:28px}.tab span{font-size:12px;font-weight:700;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}.tab.active{color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 11%,transparent)}
      .panel-card{background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:20px;box-shadow:0 7px 20px rgba(23,45,76,.06)}.page-stack{display:grid;gap:10px}.section-title{padding:3px 4px 1px}.section-title h2{font-size:21px;margin:0;font-weight:800}.section-title p{font-size:13px;color:var(--muted);margin:3px 0 0}.overview-grid{min-height:100%;display:grid;grid-template-rows:auto minmax(250px,1fr) auto auto;gap:9px}.status-row{display:grid;grid-template-columns:1fr 1.2fr;gap:8px}.connection-plaque,.flow-plaque{min-height:58px;border-radius:18px;border:1px solid var(--divider-color);background:var(--card-background-color);display:flex;align-items:center;padding:8px 11px}.connection-plaque{gap:9px}.connection-plaque .lamp{width:12px;height:12px;border-radius:50%;background:var(--muted);flex:none}.connection-plaque strong,.flow-plaque strong{display:block;font-size:16px;font-weight:700}.connection-plaque small,.flow-plaque small{display:block;font-size:13px;color:var(--muted);margin-top:2px}.connection-plaque[data-state=normal]{border-color:color-mix(in srgb,var(--ok) 30%,var(--divider-color));background:color-mix(in srgb,var(--ok) 9%,var(--card-background-color))}.connection-plaque[data-state=normal] .lamp{background:var(--ok)}.connection-plaque[data-state=emergency] .lamp{background:var(--bad)}
      .installation{position:relative;overflow:hidden;min-height:250px}.room-bg,.rack{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none}.rack{object-fit:contain;inset:3% 8% 3% 8%;width:84%;height:94%;z-index:2}.scene-label{position:absolute;z-index:3;min-width:132px;padding:7px 9px;border-radius:14px;border:1px solid var(--divider-color);background:color-mix(in srgb,var(--card-background-color) 90%,transparent);backdrop-filter:blur(4px)}.scene-label.before{left:8px;top:10px}.scene-label.after{right:8px;bottom:10px;text-align:right}.scene-label span{display:block;font-size:12px;color:var(--muted);font-weight:650}.scene-label strong{display:block;font-size:16px;margin-top:2px}.scene-label[data-state=normal]{border-color:color-mix(in srgb,var(--ok) 35%,var(--divider-color))}.scene-label[data-state=attention],.scene-label[data-state=significant]{border-color:color-mix(in srgb,var(--warn) 40%,var(--divider-color))}.scene-label[data-state=emergency]{border-color:color-mix(in srgb,var(--bad) 45%,var(--divider-color))}
      .phase-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:7px}.phase-mini{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;gap:1px 7px;padding:6px 8px;border-radius:14px;background:color-mix(in srgb,var(--primary-background-color) 60%,var(--card-background-color))}.phase-mini b{grid-row:1/3;font-size:14px;align-self:center}.phase-mini span{font-size:13px;text-align:right}.phase-mini[data-state=normal]{box-shadow:inset 3px 0 var(--ok)}.phase-mini[data-state=attention],.phase-mini[data-state=significant]{box-shadow:inset 3px 0 var(--warn)}.phase-mini[data-state=emergency]{box-shadow:inset 3px 0 var(--bad)}
      .overview-bottom{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px}.overview-bottom div{min-width:0;text-align:center}.overview-bottom span{display:block;font-size:12px;color:var(--muted);font-weight:650}.overview-bottom strong{display:block;font-size:16px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.phase-card{padding:12px 14px;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:19px;box-shadow:0 6px 18px rgba(23,45,76,.05)}.phase-head{display:grid;grid-template-columns:auto auto 1fr;gap:8px;align-items:center}.quality-dot{width:11px;height:11px;border-radius:50%;background:var(--muted)}.phase-head strong{font-size:18px}.phase-head small{font-size:13px;color:var(--muted);text-align:right}.phase-card[data-state=normal] .quality-dot{background:var(--ok)}.phase-card[data-state=attention] .quality-dot,.phase-card[data-state=significant] .quality-dot{background:var(--warn)}.phase-card[data-state=emergency] .quality-dot{background:var(--bad)}.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.metric-grid div{padding:9px 8px;border-radius:14px;background:var(--primary-background-color)}.metric-grid span{font-size:12px;color:var(--muted);font-weight:650;display:block}.metric-grid b{font-size:18px;display:block;margin-top:3px;white-space:nowrap}
      .periods{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.periods button{min-height:40px;border:1px solid var(--divider-color);border-radius:14px;background:var(--card-background-color);font-size:13px;font-weight:700}.periods button.active{color:var(--primary-color);border-color:color-mix(in srgb,var(--primary-color) 45%,var(--divider-color));background:color-mix(in srgb,var(--primary-color) 10%,var(--card-background-color))}.history-group{padding:11px}.history-group h2{font-size:17px;margin:0 0 9px}.history-host+ .history-host{margin-top:8px}.history-card{padding:9px;border-radius:15px;background:var(--primary-background-color)}.history-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.history-head h3{font-size:14px;margin:0}.history-head small{font-size:12px;color:var(--muted)}.history-card svg{display:block;width:100%;height:170px;margin-top:5px}.grid-line{stroke:var(--divider-color);stroke-width:1}.legend{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted)}.legend span{display:flex;gap:4px;align-items:center}.legend i{width:8px;height:8px;border-radius:50%;background:var(--c)}.history-state{min-height:70px;display:grid;place-items:center;font-size:13px;color:var(--muted);background:var(--primary-background-color);border-radius:14px}.history-state.error{color:var(--bad)}.note{font-size:12px;color:var(--muted);margin:0 4px 12px}.diagnostics-list{display:grid;gap:9px}.diagnostic-card{padding:11px;cursor:pointer}.diagnostic-card header{display:grid;gap:2px}.diagnostic-card header strong{font-size:15px}.diagnostic-card header small{font-size:12px;color:var(--muted);overflow-wrap:anywhere}.diag-state,.diag-attrs div{display:grid;grid-template-columns:minmax(90px,.8fr) minmax(0,1.2fr);gap:9px;padding:5px 0;border-top:1px solid var(--divider-color)}.diag-state{margin-top:8px}.diag-state span,.diag-attrs span{font-size:12px;color:var(--muted);overflow-wrap:anywhere}.diag-state b,.diag-attrs b{font-size:12px;font-weight:650;overflow-wrap:anywhere}.diagnostic-card footer{display:flex;flex-wrap:wrap;gap:8px;margin-top:7px;font-size:12px;color:var(--muted)}.empty{padding:20px;text-align:center;font-size:13px;color:var(--muted)}.zoom-toast{position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom));transform:translate(-50%,8px);opacity:0;pointer-events:none;padding:7px 11px;border-radius:12px;background:rgba(20,28,36,.88);color:#fff;font-size:12px;font-weight:700;transition:opacity .12s,transform .12s;z-index:10}.zoom-toast.show{opacity:1;transform:translate(-50%,0)}
      @media(max-width:560px){.header{grid-template-columns:48px minmax(0,1fr) 48px;gap:5px}.title-plaque{min-width:0;width:100%;padding-inline:8px}.title-plaque span{font-size:21px}.title-plaque small{font-size:13px}.work-canvas{padding-inline:8px}.status-row{grid-template-columns:1fr}.flow-plaque{min-height:50px}.overview-grid{grid-template-rows:auto minmax(235px,1fr) auto auto}.overview-bottom{grid-template-columns:1fr}.overview-bottom div{display:grid;grid-template-columns:1fr auto;align-items:center;text-align:left;padding:3px 5px}.metric-grid{grid-template-columns:1fr}.phase-head small{font-size:12px}.history-card svg{height:150px}}
    `;
  }
}

if (!customElements.get("lider-voltage-control-panel")) {
  customElements.define("lider-voltage-control-panel", LiderVoltageControlPanel);
}
