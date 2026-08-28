/* GENERATED BUNDLE — run node scripts/build-frontend-bundle.mjs; do not edit directly. */
const ENTITY_MAP = Object.freeze({
  before: {
    A: "sensor.power_monitor_voltage_a",
    B: "sensor.power_monitor_voltage_b",
    C: "sensor.power_monitor_voltage_c",
  },
  after: {
    A: "sensor.socket_zb_2_voltage",
    B: "sensor.socket_zb_3_voltage",
    C: "sensor.socket_zb_31_voltage",
  },
  power: {
    A: "sensor.power_monitor_power_a",
    B: "sensor.power_monitor_power_b",
    C: "sensor.power_monitor_power_c",
  },
  current: {
    A: "sensor.power_monitor_current_a",
    B: "sensor.power_monitor_current_b",
    C: "sensor.power_monitor_current_c",
  },
  lineUniqueId: "W0035313411160_input_voltage",
  meterOnline: "binary_sensor.power_meter_online",
  phaseLoss: "binary_sensor.power_phase_loss",
});

const ZOOM_KEY = "nikas.lider.zoom.v1";
const VIEW_KEY = "nikas.lider.view.v1";
const HISTORY_PERIOD_KEY = "nikas.lider.history_period.v1";
const TELEMETRY_SNAPSHOT_KEY = "nikas.lider.telemetry_snapshot.v1";
const DEFAULT_POLL_PERIOD_MS = 30_000;
const STALE_PERIOD_MULTIPLIER = 3;
const STATUS_REFRESH_MS = 15_000;
const LIDER_UI_VERSION = "0.6.1";
const RETURN_ROUTE_KEY = "nikas.lider.return_route.v1";
const SOURCE_ROUTE_KEY = "nikas.specialized.source_route.v1";
const SOURCE_ROUTE_AT_KEY = "nikas.specialized.source_route_at.v1";
const SAFE_DEFAULT_ROUTE = "/dashboard-infrastructure/overview";
const SAFE_ROUTE_PREFIXES = [
  "/dashboard-house-v11",
  "/dashboard-actions",
  "/dashboard-infrastructure",
];
const ROUTE_TOKENS = Object.freeze({
  house: "/dashboard-house-v11/home",
  home: "/dashboard-house-v11/home",
  actions: "/dashboard-actions/home",
  infrastructure: SAFE_DEFAULT_ROUTE,
});
const VALID_VIEWS = new Set(["overview", "before", "after", "history", "diagnostics"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeReturnRoute(value) {
  if (!value) return null;
  let candidate = String(value).trim();
  const token = ROUTE_TOKENS[candidate.toLowerCase()];
  if (token) candidate = token;
  try {
    candidate = decodeURIComponent(candidate);
  } catch (_err) {
    // Keep an unencoded route unchanged.
  }
  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const allowed = SAFE_ROUTE_PREFIXES.some((prefix) =>
      url.pathname === prefix || url.pathname.startsWith(prefix + "/")
    );
    if (!allowed) return null;
    if (url.pathname === "/dashboard-house-v11" || url.pathname.startsWith("/dashboard-house-v11/")) return "/dashboard-house-v11/home";
    if (url.pathname === "/dashboard-actions" || url.pathname.startsWith("/dashboard-actions/")) return "/dashboard-actions/home";
    return "/dashboard-infrastructure/overview";
  } catch (_err) {
    return null;
  }
}

function resolveReturnRoute(panel) {
  const current = new URL(window.location.href);
  const explicit = safeReturnRoute(current.searchParams.get("return_to")) || safeReturnRoute(current.searchParams.get("from"));
  let handedOff = null;
  let saved = null;
  try {
    const handedOffAtRaw = sessionStorage.getItem(SOURCE_ROUTE_AT_KEY);
    const handedOffAt = Number(handedOffAtRaw);
    const handedOffFresh = handedOffAtRaw === null || (Number.isFinite(handedOffAt) && Date.now() - handedOffAt <= 30_000);
    handedOff = handedOffFresh ? safeReturnRoute(sessionStorage.getItem(SOURCE_ROUTE_KEY)) : null;
    sessionStorage.removeItem(SOURCE_ROUTE_KEY);
    sessionStorage.removeItem(SOURCE_ROUTE_AT_KEY);
    saved = safeReturnRoute(sessionStorage.getItem(RETURN_ROUTE_KEY));
  } catch (_err) {
    handedOff = null;
    saved = null;
  }
  let referrer = null;
  try {
    referrer = safeReturnRoute(document.referrer);
  } catch (_err) {
    referrer = null;
  }
  const configured = safeReturnRoute(panel?.panel?.config?.parent_route || panel?._panel?.config?.parent_route);
  const route = explicit || handedOff || saved || referrer || configured || SAFE_DEFAULT_ROUTE;
  try {
    sessionStorage.setItem(RETURN_ROUTE_KEY, route);
  } catch (_err) {
    // sessionStorage can be unavailable in hardened browser modes.
  }
  return route;
}

function navigateHome(panel) {
  const route = safeReturnRoute(panel._returnRoute) || SAFE_DEFAULT_ROUTE;
  window.history.pushState(null, "", route);
  window.dispatchEvent(new Event("location-changed"));
}

class LiderVoltageControlPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    const storedView = localStorage.getItem(VIEW_KEY) || "overview";
    this._view = VALID_VIEWS.has(storedView) ? storedView : "overview";
    this._zoom = this._loadZoom();
    this._gesture = null;
    this._lastTwoTap = 0;
    this._suppressClicksUntil = 0;
    this._toastTimer = null;
    this._lineEntityId = null;
    this._registryLoaded = false;
    this._registryLoading = false;
    this._diagnosticEntities = { before: [], after: { A: [], B: [], C: [] }, line: [] };
    this._historyPeriod = localStorage.getItem(HISTORY_PERIOD_KEY) || "24h";
    this._historyCards = [];
    this._historyMountToken = 0;
    this._telemetrySnapshot = this._loadTelemetrySnapshot();
    this._statusTimer = null;
    this._renderedView = null;
    this._statusCategoryKey = null;
    this._viewCache = new Map();
    this._historyMountedPeriod = null;
    this._updateFrame = null;
    this._resizeHandler = () => this._applyTransform();
    this._returnRoute = null;
  }

  set hass(value) {
    this._hass = value;
    this._captureTelemetrySnapshot();
    if (!this._mounted) {
      this._mount();
    }
    if (!this._registryLoaded && !this._registryLoading) {
      this._resolveRegistryEntities();
    }
    this._queueLiveUpdate();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (!this._mounted) this._mount();
    this._startStatusTimer();
    window.removeEventListener("resize", this._resizeHandler);
    window.addEventListener("resize", this._resizeHandler);
  }

  disconnectedCallback() {
    clearInterval(this._statusTimer);
    this._statusTimer = null;
    if (this._updateFrame !== null) cancelAnimationFrame(this._updateFrame);
    this._updateFrame = null;
    clearTimeout(this._toastTimer);
    this._toastTimer = null;
    this._historyMountToken += 1;
    window.removeEventListener("resize", this._resizeHandler);
  }

  _queueLiveUpdate() {
    if (!this._mounted || this._updateFrame !== null) return;
    this._updateFrame = requestAnimationFrame(() => {
      this._updateFrame = null;
      this._updateLiveDom();
    });
  }

  _loadZoom() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ZOOM_KEY) || "{}");
      return {
        scale: this._clamp(Number(parsed.scale) || 1, 0.75, 2),
        x: Number(parsed.x) || 0,
        y: Number(parsed.y) || 0,
      };
    } catch (_err) {
      return { scale: 1, x: 0, y: 0 };
    }
  }

  _loadTelemetrySnapshot() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TELEMETRY_SNAPSHOT_KEY) || "{}");
      return parsed && typeof parsed === "object"
        ? { updatedAt: Number(parsed.updatedAt) || null, values: parsed.values || {} }
        : { updatedAt: null, values: {} };
    } catch (_err) {
      return { updatedAt: null, values: {} };
    }
  }

  _startStatusTimer() {
    if (this._statusTimer) return;
    this._statusTimer = setInterval(() => {
      if (this._view === "overview" && this.isConnected) this._updateConnectionBadge();
    }, STATUS_REFRESH_MS);
  }

  async _resolveRegistryEntities() {
    if (!this._hass?.callWS) return;
    this._registryLoading = true;
    try {
      const entries = await this._hass.callWS({ type: "config/entity_registry/list" });
      const enabled = entries.filter((entry) => !entry.disabled_by && !entry.hidden_by);
      const lineEntry = enabled.find((entry) =>
        entry.platform === "stark_solarpower" && entry.unique_id === ENTITY_MAP.lineUniqueId
      );
      this._lineEntityId = lineEntry?.entity_id || null;

      const meterDeviceIds = new Set(
        enabled
          .filter((entry) => Object.values(ENTITY_MAP.before).includes(entry.entity_id))
          .map((entry) => entry.device_id)
          .filter(Boolean)
      );
      this._diagnosticEntities.before = enabled
        .filter((entry) =>
          this._diagnosticDomain(entry.entity_id) &&
          (meterDeviceIds.has(entry.device_id) || entry.entity_id.startsWith("sensor.power_monitor_") ||
            [ENTITY_MAP.meterOnline, ENTITY_MAP.phaseLoss].includes(entry.entity_id))
        )
        .map((entry) => entry.entity_id);

      for (const phase of ["A", "B", "C"]) {
        const voltageEntry = enabled.find((entry) => entry.entity_id === ENTITY_MAP.after[phase]);
        this._diagnosticEntities.after[phase] = enabled
          .filter((entry) =>
            this._diagnosticDomain(entry.entity_id) &&
            ((voltageEntry?.device_id && entry.device_id === voltageEntry.device_id) ||
              entry.entity_id.startsWith(ENTITY_MAP.after[phase].replace(/_voltage$/, "_")))
          )
          .map((entry) => entry.entity_id);
      }

      this._diagnosticEntities.line = lineEntry?.device_id
        ? enabled
            .filter((entry) => this._diagnosticDomain(entry.entity_id) && entry.device_id === lineEntry.device_id)
            .map((entry) => entry.entity_id)
        : [];
    } catch (_err) {
      this._lineEntityId = null;
    } finally {
      this._registryLoaded = true;
      this._registryLoading = false;
      this._historyMountedPeriod = null;
      this._queueLiveUpdate();
    }
  }

  _diagnosticDomain(entityId) {
    const domain = String(entityId || "").split(".")[0];
    return Boolean(domain) && !new Set([
      "automation", "button", "event", "scene", "script",
    ]).has(domain);
  }

  _mount() {
    this._mounted = true;
    this._returnRoute = resolveReturnRoute(this);
    this.shadowRoot.innerHTML =
      '<style>' + this._styles() + '</style>' +
      '<div class="app">' +
        '<header class="header">' +
          '<button class="shell-button menu" aria-label="Меню Home Assistant"><ha-icon icon="mdi:menu"></ha-icon></button>' +
          '<button class="title title-return" type="button" aria-label="LIDER — вернуться в базовую панель NikaS"><strong>LIDER</strong><small>UI v' + LIDER_UI_VERSION + '</small></button>' +
          '<button class="shell-button refresh" aria-label="Обновить"><ha-icon icon="mdi:refresh"></ha-icon></button>' +
        '</header>' +
        '<main class="viewport">' +
          '<section class="canvas"></section>' +
        '</main>' +
        '<nav class="tabs">' +
          this._tabButton("overview", "mdi:home-outline", "Обзор") +
          this._tabButton("before", "mdi:arrow-right-bold", "До LIDER") +
          this._tabButton("after", "mdi:arrow-left-bold", "После") +
          this._tabButton("history", "mdi:chart-line", "Статистика") +
          this._tabButton("diagnostics", "mdi:stethoscope", "Диагностика") +
        '</nav>' +
        '<div class="zoom-toast" aria-live="polite">Масштаб 100%</div>' +
      '</div>';

    this._viewport = this.shadowRoot.querySelector(".viewport");
    this._canvas = this.shadowRoot.querySelector(".canvas");
    this._toast = this.shadowRoot.querySelector(".zoom-toast");

    this.shadowRoot.querySelector(".menu").addEventListener("click", () => {
      this.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true }));
    });
    this.shadowRoot.querySelector(".refresh").addEventListener("click", () => {
      this._queueLiveUpdate();
    });
    this.shadowRoot.querySelector(".title-return").addEventListener("click", () => navigateHome(this));
    this.shadowRoot.querySelector(".tabs").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (!button || button.dataset.view === this._view) return;
      this._view = button.dataset.view;
      localStorage.setItem(VIEW_KEY, this._view);
      this._zoom.x = 0;
      this._zoom.y = 0;
      this._saveZoom();
      this._viewport.scrollTo({ left: 0, top: 0 });
      this._renderContent();
    });
    this._canvas.addEventListener("click", (event) => {
      if (Date.now() < this._suppressClicksUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const periodButton = event.target.closest("[data-history-period]");
      if (periodButton) {
        this._historyPeriod = periodButton.dataset.historyPeriod;
        localStorage.setItem(HISTORY_PERIOD_KEY, this._historyPeriod);
        this._updateHistoryPeriod();
        return;
      }
      const target = event.target.closest("[data-entity]");
      if (!target || this._gesture?.moved) return;
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId: target.dataset.entity },
      }));
    }, true);
    this._canvas.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      const target = event.target.closest?.(".raw-entity[data-entity]");
      if (!target) return;
      event.preventDefault();
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId: target.dataset.entity },
      }));
    });

    this._viewport.addEventListener("touchstart", (event) => this._touchStart(event), { passive: false });
    this._viewport.addEventListener("touchmove", (event) => this._touchMove(event), { passive: false });
    this._viewport.addEventListener("touchend", (event) => this._touchEnd(event), { passive: false });
    this._viewport.addEventListener("touchcancel", (event) => this._touchEnd(event), { passive: false });
    this._renderContent();
  }

  _tabButton(view, icon, label) {
    return '<button data-view="' + view + '"><ha-icon icon="' + icon + '"></ha-icon><small>' + label + '</small></button>';
  }

  _renderContent() {
    if (!this._canvas) return;
    this._historyMountToken += 1;
    let root = this._viewCache.get(this._view);
    if (!root) {
      const template = document.createElement("template");
      template.innerHTML = this._viewHtml(this._view);
      root = template.content.firstElementChild;
      if (!root) return;
      this._viewCache.set(this._view, root);
    }
    if (this._canvas.firstElementChild !== root) this._canvas.replaceChildren(root);
    this._renderedView = this._view;
    this._statusCategoryKey = null;
    this.shadowRoot.querySelectorAll(".tabs button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === this._view);
    });
    if (this._view === "history") {
      if (this._historyMountedPeriod !== this._historyPeriod || !this._historyCards.length) {
        requestAnimationFrame(() => this._mountHistoryCards());
      } else {
        this._historyCards.forEach((card) => { card.hass = this._hass; });
      }
    }
    this._queueLiveUpdate();
    requestAnimationFrame(() => this._applyTransform());
  }

  _viewHtml(view = this._view) {
    const renderers = {
      overview: () => this._overview(),
      before: () => this._detailGroup("До стабилизаторов", ENTITY_MAP.before, "before"),
      after: () => this._detailGroup("После стабилизаторов", ENTITY_MAP.after, "quality"),
      history: () => this._historyView(),
      diagnostics: () => this._diagnosticsView(),
    };
    return (renderers[view] || renderers.overview)();
  }

  _updateLiveDom() {
    if (!this._canvas || this._renderedView !== this._view) return;
    if (this._view === "history") {
      if (this._registryLoaded &&
          (this._historyMountedPeriod !== this._historyPeriod || !this._historyCards.length)) {
        this._mountHistoryCards();
        return;
      }
      this._historyCards.forEach((card) => { card.hass = this._hass; });
      return;
    }
    const template = document.createElement("template");
    template.innerHTML = this._viewHtml(this._view);
    const current = this._canvas.firstElementChild;
    const next = template.content.firstElementChild;
    if (current && next) {
      if (!this._sameNodeKind(current, next)) {
        const replacement = next.cloneNode(true);
        current.replaceWith(replacement);
        this._viewCache.set(this._view, replacement);
      } else {
        this._patchExistingTree(current, next);
      }
    }
    this._updateConnectionBadge();
  }

  _sameNodeKind(current, next) {
    return Boolean(current && next && current.nodeType === next.nodeType &&
      (current.nodeType !== Node.ELEMENT_NODE || current.tagName === next.tagName));
  }

  _syncAttributes(current, next) {
    for (const attribute of Array.from(current.attributes || [])) {
      if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
    }
    for (const attribute of Array.from(next.attributes || [])) {
      if (current.getAttribute(attribute.name) !== attribute.value) {
        current.setAttribute(attribute.name, attribute.value);
      }
    }
  }

  _patchExistingTree(current, next) {
    if (!this._sameNodeKind(current, next)) return false;
    if (current.nodeType === Node.TEXT_NODE) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return true;
    }
    if (current.nodeType !== Node.ELEMENT_NODE) return true;
    if (current.matches?.(".overall")) return true;
    this._syncAttributes(current, next);
    let index = 0;
    while (index < next.childNodes.length) {
      const wanted = next.childNodes[index];
      const existing = current.childNodes[index];
      if (!existing) {
        current.appendChild(wanted.cloneNode(true));
      } else if (!this._sameNodeKind(existing, wanted)) {
        existing.replaceWith(wanted.cloneNode(true));
      } else {
        this._patchExistingTree(existing, wanted);
      }
      index += 1;
    }
    while (current.childNodes.length > next.childNodes.length) current.lastChild.remove();
    return true;
  }

  _connectionCategoryKey() {
    const freshness = this._telemetryFreshness();
    return this._connectionState() + ":" + freshness.key;
  }

  _updateConnectionBadge() {
    if (this._view !== "overview" || !this._canvas) return;
    const key = this._connectionCategoryKey();
    if (key === this._statusCategoryKey) return;
    const current = this._canvas.querySelector(".overall");
    if (!current) return;
    const template = document.createElement("template");
    template.innerHTML = this._connectionBadge();
    const next = template.content.firstElementChild;
    current.className = next.className;
    current.setAttribute("aria-label", next.getAttribute("aria-label"));
    const main = current.querySelector(".status-main");
    const nextMain = next.querySelector(".status-main");
    const sub = current.querySelector(".status-sub");
    const nextSub = next.querySelector(".status-sub");
    if (main.textContent !== nextMain.textContent) main.textContent = nextMain.textContent;
    if (sub.textContent !== nextSub.textContent) sub.textContent = nextSub.textContent;
    if (sub.className !== nextSub.className) sub.className = nextSub.className;
    this._statusCategoryKey = key;
  }

  _updateHistoryPeriod() {
    if (this._view !== "history") return;
    this._historyMountedPeriod = null;
    this._historyCards = [];
    const labels = { "24h": "24 часа", "7d": "7 дней", "30d": "30 дней", "12m": "12 месяцев" };
    this._canvas.querySelectorAll("[data-history-period]").forEach((button) => {
      button.classList.toggle("active", button.dataset.historyPeriod === this._historyPeriod);
    });
    const label = this._canvas.querySelector(".history-period-label");
    if (label) label.textContent = labels[this._historyPeriod];
    this._canvas.querySelectorAll("[data-history-card]").forEach((host) => {
      const loading = document.createElement("div");
      loading.className = "history-loading";
      loading.textContent = "Загрузка истории…";
      host.replaceChildren(loading);
    });
    this._mountHistoryCards();
  }

  _overview() {
    return '<div class="page">' +
      '<section class="installation" role="img" aria-label="Три стабилизатора LIDER PS7500W-15 на стойке с внешним пофазным байпасом">' +
        '<div class="scene-heading"><h1>Контроль электросети</h1>' +
          '<p>Вход → LIDER → домашняя сеть</p></div>' +
        this._connectionBadge() +
        '<img class="installation-equipment" src="/lider_voltage_control_panel/assets/lider-rack-ps22w30-v2.webp?v=0.3.2" alt="" aria-hidden="true" loading="eager" decoding="sync">' +
        this._scenePhase("A", "phase-a") +
        this._scenePhase("B", "phase-b") +
        this._scenePhase("C", "phase-c") +
        '<div class="installation-caption"><span>LIDER PS7500W-15 · 3 шт.</span><strong>Стойка 9-36 · пофазный байпас</strong></div>' +
      '</section>' +
      this._lineCard() +
    '</div>';
  }

  _scenePhase(phase, positionClass) {
    const inputEntity = ENTITY_MAP.before[phase];
    const outputEntity = ENTITY_MAP.after[phase];
    return '<div class="scene-phase side-input ' + positionClass + '">' +
        '<strong>Фаза ' + phase + ' · вход</strong>' +
        '<div class="input-metrics">' +
          this._scenePower(ENTITY_MAP.power[phase]) +
          this._sceneReading("Напряжение", inputEntity, "before") +
        '</div>' +
      '</div>' +
      '<div class="scene-phase side-output ' + positionClass + '">' +
        '<strong>Фаза ' + phase + ' · выход</strong>' +
        this._sceneReading("Напряжение", outputEntity, "quality") +
      '</div>';
  }

  _sceneReading(label, entityId, policy) {
    const reading = this._reading(entityId);
    const severity = reading.available ? this._severity(reading.value, policy) : "unavailable";
    return '<button class="scene-reading ' + severity + '" data-entity="' + entityId + '">' +
      '<span>' + label + '</span><b>' +
      (reading.available ? this._number(reading.value) + ' В' : 'Нет данных') +
    '</b></button>';
  }

  _scenePower(entityId) {
    return '<button class="scene-power" data-entity="' + entityId + '">' +
      '<span>Мощность</span><b>' + this._stateText(entityId) + '</b></button>';
  }

  _summarySection(title, entities, policy) {
    return '<section class="panel-card">' +
      '<div class="section-head"><h2>' + title + '</h2>' + this._groupBadge(entities, policy) + '</div>' +
      '<div class="phase-grid">' +
        ["A", "B", "C"].map((phase) => this._metricCard("Фаза " + phase, entities[phase], policy)).join("") +
      '</div>' +
    '</section>';
  }

  _detailGroup(title, entities, policy) {
    const thresholds = policy === "before"
      ? "Норма 150–265 В · отклонение 135–150 В · предаварийно 125–135 / 265–275 В · авария &lt;125 / &gt;275 В"
      : "Норма 210–230 В · внимание 205–210 / 230–235 В · существенно 198–205 / 235–242 В · авария &lt;198 / &gt;242 В";
    return '<div class="page">' +
      '<section class="hero compact"><div class="hero-title"><h1>' + title + '</h1></div>' +
      this._groupBadge(entities, policy) + '</section>' +
      '<section class="panel-card phase-telemetry-grid">' +
        ["A", "B", "C"].map((phase) => this._phaseTelemetryColumn(phase, entities, policy)).join("") +
      '</section>' +
      (policy === "before"
        ? this._diagnosticSection("Диагностика входного измерителя", this._diagnosticEntities.before,
            [...Object.values(entities), ...Object.values(ENTITY_MAP.current), ...Object.values(ENTITY_MAP.power)])
        : ["A", "B", "C"].map((phase) =>
            this._diagnosticSection("Диагностика розетки · фаза " + phase,
              this._diagnosticEntities.after[phase], [
                entities[phase],
                this._relatedAfterEntity(phase, "current"),
                this._relatedAfterEntity(phase, "power"),
              ])
          ).join("")) +
      '<section class="thresholds"><h2>Граничные значения</h2><p>' + thresholds + '</p></section>' +
      (policy === "quality" ? '<p class="note">Выходные A/B/C — подтверждённые временные контрольные точки старой панели. Постоянные датчики заменят их без изменения интерфейса.</p>' : '') +
    '</div>';
  }

  _phaseTelemetryColumn(phase, voltageEntities, policy) {
    const before = policy === "before";
    const currentEntity = before ? ENTITY_MAP.current[phase] : this._relatedAfterEntity(phase, "current");
    const powerEntity = before ? ENTITY_MAP.power[phase] : this._relatedAfterEntity(phase, "power");
    return '<div class="phase-telemetry-column">' +
      '<h2>Фаза ' + phase + '</h2>' +
      this._measurementCard("Напряжение", voltageEntities[phase], policy, before) +
      this._measurementCard("Ток", currentEntity, null, before) +
      this._measurementCard("Мощность", powerEntity, null, before) +
    '</div>';
  }

  _measurementCard(label, entityId, policy = null, requiresInput = false) {
    const state = this._displayState(entityId);
    const rawAvailable = Boolean(state) && !["unknown", "unavailable", "none", ""]
      .includes(String(state.state).toLowerCase());
    const available = rawAvailable && (!requiresInput || this._inputTelemetryState() === "ok");
    const reading = policy ? this._reading(entityId) : null;
    const severity = !available ? "unavailable" : (policy ? this._severity(reading.value, policy) : "neutral");
    const entityAttr = entityId ? ' data-entity="' + entityId + '"' : '';
    const value = available
      ? (policy ? this._number(reading.value) + ' В' : this._stateText(entityId))
      : 'Нет данных';
    return '<button class="metric phase-measurement ' + severity + '"' + entityAttr + '>' +
      '<span class="metric-label">' + label + '</span>' +
      '<strong>' + value + '</strong>' +
      '<small>' + (policy ? this._severityLabel(severity) : '&nbsp;') + '</small>' +
    '</button>';
  }

  _relatedAfterEntity(phase, kind) {
    const voltageEntity = ENTITY_MAP.after[phase];
    const exact = voltageEntity.replace(/_voltage$/, '_' + kind);
    if (this._hass?.states?.[exact]) return exact;
    const namePattern = kind === "current" ? /ток|current/i : /мощност|power/i;
    return (this._diagnosticEntities.after[phase] || []).find((entityId) => {
      if (entityId === voltageEntity || /energy|энерги/i.test(entityId) || this._isGenerationEntity(entityId)) {
        return false;
      }
      const friendlyName = this._hass?.states?.[entityId]?.attributes?.friendly_name || "";
      return namePattern.test(entityId) || namePattern.test(friendlyName);
    }) || exact;
  }

  _historyView() {
    const periods = [
      ["24h", "24 часа"],
      ["7d", "7 дней"],
      ["30d", "30 дней"],
      ["12m", "12 месяцев"],
    ];
    return '<div class="page history-page">' +
      '<section class="hero compact"><div class="hero-title"><h1>Статистика</h1></div>' +
      '<span class="badge neutral history-period-label">' + periods.find(([id]) => id === this._historyPeriod)[1] + '</span></section>' +
      '<section class="panel-card history-periods" aria-label="Период статистики">' +
        periods.map(([id, label]) => '<button data-history-period="' + id + '" class="' +
          (id === this._historyPeriod ? 'active' : '') + '">' + label + '</button>').join('') +
      '</section>' +
      '<section class="panel-card history-group"><h2>До стабилизаторов</h2>' +
        this._historyHost("before-voltage") +
        this._historyHost("before-current") +
        this._historyHost("before-power") +
      '</section>' +
      '<section class="panel-card history-group"><h2>После стабилизаторов</h2>' +
        this._historyHost("after-voltage") +
        this._historyHost("after-current") +
        this._historyHost("after-power") +
      '</section>' +
      '<section class="panel-card history-group"><h2>Неотключаемая линия</h2>' +
        this._historyHost("line-voltage") + '</section>' +
      '<p class="note">Графики используют обычную историю Home Assistant и доступны в пределах срока хранения Recorder.</p>' +
    '</div>';
  }

  _historyHost(id) {
    return '<section class="history-card-host" data-history-card="' + id + '">' +
      '<div class="history-loading">Загрузка истории…</div>' +
    '</section>';
  }

  async _mountHistoryCards() {
    if (this._view !== "history" || !this._registryLoaded) return;
    const mountToken = ++this._historyMountToken;
    const period = {
      "24h": { hours: 24 },
      "7d": { hours: 168 },
      "30d": { hours: 720 },
      "12m": { hours: 8760 },
    }[this._historyPeriod];
    try {
      const helpers = await window.loadCardHelpers();
      if (this._view !== "history" || mountToken !== this._historyMountToken) return;
      const configs = this._historyCardConfigs(period);
      this._historyCards = [];
      for (const [id, config] of Object.entries(configs)) {
        if (this._view !== "history" || mountToken !== this._historyMountToken) return;
        const host = this._canvas.querySelector('[data-history-card="' + id + '"]');
        if (!host) continue;
        const card = helpers.createCardElement(config);
        card.hass = this._hass;
        host.replaceChildren(card);
        this._historyCards.push(card);
      }
      this._historyMountedPeriod = this._historyPeriod;
      this._canvas.querySelectorAll(".history-loading").forEach((node) => {
        node.textContent = "Нет данных";
      });
    } catch (_err) {
      this._canvas.querySelectorAll(".history-loading").forEach((node) => {
        node.textContent = "История Home Assistant недоступна";
      });
    }
  }

  _historyCardConfigs(period) {
    const phases = ["A", "B", "C"];
    const entityList = (map, prefix) => phases
      .filter((phase) => !this._isGenerationEntity(map[phase]))
      .map((phase) => ({ entity: map[phase], name: prefix + " " + phase }));
    const afterRelated = (kind) => Object.fromEntries(
      phases.map((phase) => [phase, this._relatedAfterEntity(phase, kind)])
    );
    const graph = (title, entities) => ({
      type: "history-graph",
      title,
      entities,
      hours_to_show: period.hours,
    });
    const configs = {
      "before-voltage": graph("Напряжение", entityList(ENTITY_MAP.before, "Фаза")),
      "before-current": graph("Ток", entityList(ENTITY_MAP.current, "Фаза")),
      "before-power": graph("Мощность", entityList(ENTITY_MAP.power, "Фаза")),
      "after-voltage": graph("Напряжение", entityList(ENTITY_MAP.after, "Фаза")),
      "after-current": graph("Ток", entityList(afterRelated("current"), "Фаза")),
      "after-power": graph("Мощность", entityList(afterRelated("power"), "Фаза")),
    };
    if (this._lineEntity()) {
      configs["line-voltage"] = graph("Напряжение", [{
        entity: this._lineEntity(),
        name: "UPS Котёл",
      }]);
    }
    return configs;
  }

  _entitySort(left, right) {
    const leftName = this._hass?.states?.[left]?.attributes?.friendly_name || left;
    const rightName = this._hass?.states?.[right]?.attributes?.friendly_name || right;
    return String(leftName).localeCompare(String(rightName), this._hass?.locale?.language || "ru");
  }

  _diagnosticsGroups() {
    const knownBefore = [
      ...Object.values(ENTITY_MAP.before),
      ...Object.values(ENTITY_MAP.current),
      ...Object.values(ENTITY_MAP.power),
      ENTITY_MAP.meterOnline,
      ENTITY_MAP.phaseLoss,
    ];
    const groups = [
      {
        title: "Входной измеритель",
        subtitle: "Все состояния и атрибуты сущностей, формирующих контроль до LIDER.",
        ids: [...knownBefore, ...(this._diagnosticEntities.before || [])],
      },
      ...["A", "B", "C"].map((phase) => ({
        title: "После LIDER · фаза " + phase,
        subtitle: "Полный raw-набор контрольного устройства этой фазы.",
        ids: [
          ENTITY_MAP.after[phase],
          this._relatedAfterEntity(phase, "current"),
          this._relatedAfterEntity(phase, "power"),
          ...(this._diagnosticEntities.after?.[phase] || []),
        ],
      })),
      {
        title: "Неотключаемая линия · UPS Котёл",
        subtitle: "Все найденные диагностические сущности устройства Stark SolarPower.",
        ids: [this._lineEntity(), ...(this._diagnosticEntities.line || [])],
      },
    ];
    return groups.map((group) => ({
      ...group,
      ids: [...new Set(group.ids.filter((entityId) => entityId && this._hass?.states?.[entityId]))]
        .sort((left, right) => this._entitySort(left, right)),
    }));
  }

  _diagnosticValue(value) {
    if (value === undefined) return "—";
    if (value === null) return "null";
    if (["string", "number", "boolean"].includes(typeof value)) return String(value);
    try {
      return JSON.stringify(value);
    } catch (_err) {
      return String(value);
    }
  }

  _rawRow(label, value, className = "") {
    return '<div class="raw-row' + (className ? ' ' + className : '') + '"><span>' +
      escapeHtml(label) + '</span><strong>' + escapeHtml(this._diagnosticValue(value)) + '</strong></div>';
  }

  _rawEntity(entityId) {
    const state = this._hass?.states?.[entityId];
    if (!state) return "";
    const attrs = state.attributes || {};
    const name = attrs.friendly_name || entityId;
    const attrRows = Object.keys(attrs)
      .sort((left, right) => left.localeCompare(right, this._hass?.locale?.language || "ru"))
      .map((key) => this._rawRow(key, attrs[key]))
      .join("");
    const context = state.context || {};
    const contextRows = [
      ["context.id", context.id],
      ["context.parent_id", context.parent_id],
      ["context.user_id", context.user_id],
    ].filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => this._rawRow(key, value))
      .join("");
    return '<article class="raw-entity" data-entity="' + escapeHtml(entityId) +
      '" role="button" tabindex="0" aria-label="' + escapeHtml(name) + '">' +
      '<div class="raw-entity-head"><div><h3>' + escapeHtml(name) + '</h3><code>' +
      escapeHtml(entityId) + '</code></div><ha-icon icon="mdi:chevron-right"></ha-icon></div>' +
      '<div class="raw-list">' +
      this._rawRow("state", state.state, "raw-state") +
      this._rawRow("last_changed", state.last_changed) +
      this._rawRow("last_updated", state.last_updated) +
      this._rawRow("last_reported", state.last_reported) +
      contextRows + attrRows + '</div></article>';
  }

  _diagnosticsView() {
    const groups = this._diagnosticsGroups();
    const total = groups.reduce((sum, group) => sum + group.ids.length, 0);
    return '<div class="page diagnostics-page">' +
      '<section class="hero compact diagnostics-hero"><div class="hero-title"><span class="eyebrow">ТЕХНИЧЕСКИЙ ЭКРАН</span><h1>Диагностика</h1><p>Raw-состояния и все атрибуты задействованных сущностей Home Assistant.</p></div><span class="badge neutral">' + total + ' сущн.</span></section>' +
      groups.map((group) => '<section class="panel-card raw-group"><div class="section-head raw-group-head"><div><h2>' +
        escapeHtml(group.title) + '</h2><p>' + escapeHtml(group.subtitle) +
        '</p></div><span class="raw-count">' + group.ids.length + '</span></div>' +
        (group.ids.length
          ? '<div class="raw-entities">' + group.ids.map((entityId) => this._rawEntity(entityId)).join("") + '</div>'
          : '<p class="raw-empty">Сущности пока не найдены.</p>') +
        '</section>').join("") +
      '<p class="note">Экран не фильтрует сервисные, энергетические или raw-атрибуты. Нажатие на сущность открывает More Info Home Assistant.</p>' +
      '</div>';
  }

  _lineView() {
    const lineEntity = this._lineEntity();
    return '<div class="page">' +
      '<section class="hero compact"><div><span class="eyebrow">ОТДЕЛЬНЫЙ ОБЪЕКТ</span><h1>Неотключаемая линия</h1>' +
      '<p>После переключателя фаз; не является четвёртой фазой</p></div>' +
      this._entityBadge(lineEntity, "quality") + '</section>' +
      '<section class="panel-card line-focus">' +
        this._metricCard("Входное напряжение UPS Котёл", lineEntity, "quality", true) +
        '<p>Источник: вход UPS Котёл · Stark SolarPower.</p>' +
      '</section>' +
      this._diagnosticSection("Диагностика UPS Котёл", this._diagnosticEntities.line, [lineEntity]) +
      '<section class="thresholds"><h2>Граничные значения</h2>' +
      '<p>Норма 210–230 В · внимание 205–210 / 230–235 В · существенно 198–205 / 235–242 В · авария &lt;198 / &gt;242 В.</p></section>' +
    '</div>';
  }

  _lineCard() {
    const lineEntity = this._lineEntity();
    return '<section class="panel-card line-card">' +
      '<div><span class="eyebrow">НЕОТКЛЮЧАЕМАЯ ЛИНИЯ</span><h2>Отдельный контроль</h2>' +
      '<p>Вход UPS Котёл · Stark SolarPower</p></div>' +
      this._metricCard("Напряжение", lineEntity, "quality") +
    '</section>';
  }

  _lineEntity() {
    return this._lineEntityId;
  }

  _metricCard(label, entityId, policy, large = false) {
    const reading = this._reading(entityId);
    const inputAvailable = policy !== "before" || this._inputTelemetryState() === "ok";
    const available = reading.available && inputAvailable;
    const severity = available ? this._severity(reading.value, policy) : "unavailable";
    const entityAttr = entityId ? ' data-entity="' + entityId + '"' : '';
    return '<button class="metric ' + severity + (large ? ' large' : '') + '"' + entityAttr + '>' +
      '<span class="metric-label">' + label + '</span>' +
      '<strong>' + (available ? this._number(reading.value) + ' В' : 'Нет данных') + '</strong>' +
      '<small>' + this._severityLabel(severity) + '</small>' +
    '</button>';
  }

  _diagnosticSection(title, entityIds, excluded = []) {
    const excludedSet = new Set(excluded.filter(Boolean));
    const entities = [...new Set(entityIds || [])]
      .filter((entityId) => !excludedSet.has(entityId) && !this._isGenerationEntity(entityId) &&
        this._hass?.states?.[entityId]);
    if (!entities.length) return '';
    return '<section class="panel-card diagnostic-section">' +
      '<div class="section-head"><h2>' + title + '</h2></div>' +
      '<div class="diagnostic-grid">' + entities.map((entityId) => this._diagnosticCard(entityId)).join('') + '</div>' +
    '</section>';
  }

  _diagnosticCard(entityId, explicitLabel = null) {
    const state = this._hass?.states?.[entityId];
    const label = explicitLabel || state?.attributes?.friendly_name ||
      entityId.split('.')[1].replaceAll('_', ' ');
    return '<button class="diagnostic-metric" data-entity="' + entityId + '">' +
      '<span>' + label + '</span><strong>' + this._stateText(entityId) + '</strong>' +
    '</button>';
  }

  _isGenerationEntity(entityId) {
    if (!entityId) return false;
    const friendlyName = this._hass?.states?.[entityId]?.attributes?.friendly_name || "";
    return /produced|production|generated|generation|export|reverse|returned|feed.?in|обратн|произвед|генерац|выработ|отдач/i
      .test(entityId + " " + friendlyName);
  }

  _stateText(entityId) {
    const state = this._displayState(entityId);
    if (!state || ["unknown", "unavailable", "none", ""].includes(String(state.state).toLowerCase())) {
      return 'Нет данных';
    }
    if (entityId.startsWith('binary_sensor.')) {
      return state.state === 'on' ? 'Да' : 'Нет';
    }
    const value = Number(state.state);
    const unit = state.attributes?.unit_of_measurement || '';
    if (Number.isFinite(value)) {
      const digits = unit === 'W' || unit === 'Вт' || unit === '%' ? 0 : 1;
      return new Intl.NumberFormat(this._hass?.locale?.language || 'ru', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value) + (unit ? ' ' + unit : '');
    }
    return String(state.state);
  }

  _groupBadge(entities, policy) {
    const severity = policy === "before"
      ? this._beforeSeverity(entities)
      : this._groupSeverity(entities, policy);
    return '<span class="badge ' + severity + '">' + this._severityLabel(severity) + '</span>';
  }

  _entityBadge(entityId, policy) {
    const reading = this._reading(entityId);
    const severity = reading.available ? this._severity(reading.value, policy) : "unavailable";
    return '<span class="badge ' + severity + '">' + this._severityLabel(severity) + '</span>';
  }

  _reading(entityId) {
    const state = this._displayState(entityId);
    if (!state || ["unknown", "unavailable", "none", ""].includes(String(state.state).toLowerCase())) {
      return { available: false, value: null };
    }
    const value = Number(state.state);
    return Number.isFinite(value) ? { available: true, value } : { available: false, value: null };
  }

  _severity(value, policy) {
    if (policy === "before") {
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

  _severityLabel(severity) {
    return {
      normal: "Норма",
      attention: "Внимание",
      significant: "Существенное отклонение",
      emergency: "Авария",
      unavailable: "Нет данных",
    }[severity] || "Нет данных";
  }

  _worst(values) {
    for (const severity of ["emergency", "significant", "attention", "unavailable", "normal"]) {
      if (values.includes(severity)) return severity;
    }
    return "unavailable";
  }

  _overallClass() {
    return {
      local: "normal",
      offline: "emergency",
      unknown: "unavailable",
    }[this._connectionState()];
  }

  _overallLabel() {
    return {
      local: "Локально",
      offline: "Нет связи",
      unknown: "Нет данных",
    }[this._connectionState()];
  }

  _connectionState() {
    const meter = this._binaryState(ENTITY_MAP.meterOnline);
    if (meter === "on") return "local";
    if (meter === "off") return "offline";
    return "unknown";
  }

  _connectionBadge() {
    const freshness = this._telemetryFreshness();
    return '<button class="overall ' + this._overallClass() + '" data-entity="' +
      ENTITY_MAP.meterOnline + '" aria-label="Связь: ' + this._overallLabel() +
      '. Телеметрия: ' + freshness.label + '">' +
      '<span class="status-lamp" aria-hidden="true"></span>' +
      '<span class="status-main">' + this._overallLabel() + '</span>' +
      '<span class="status-sub ' + freshness.className + '">' + freshness.label + '</span>' +
    '</button>';
  }

  _telemetryFreshness() {
    const connection = this._connectionState();
    const updatedAt = this._lastSuccessfulTelemetryAt();
    if (connection === "unknown" || !updatedAt) {
      return { key: "unknown", className: "freshness-unknown", label: "Нет данных" };
    }
    if (connection === "offline" || Date.now() - updatedAt > this._staleAfterMs()) {
      return { key: "stale", className: "freshness-stale", label: "Данные устарели" };
    }
    return { key: "fresh", className: "freshness-current", label: "Данные актуальны" };
  }

  _staleAfterMs() {
    const candidates = [ENTITY_MAP.meterOnline, ...Object.values(ENTITY_MAP.before)]
      .map((entityId) => this._pollPeriodFromState(this._hass?.states?.[entityId]))
      .filter(Number.isFinite);
    const pollPeriod = candidates.length ? Math.min(...candidates) : DEFAULT_POLL_PERIOD_MS;
    return pollPeriod * STALE_PERIOD_MULTIPLIER;
  }

  _pollPeriodFromState(state) {
    if (!state?.attributes) return NaN;
    for (const key of ["scan_interval", "poll_interval", "update_interval"]) {
      const raw = state.attributes[key];
      if (typeof raw === "number" && raw > 0) return raw * 1000;
      const match = String(raw || "").match(/^(\d+(?:\.\d+)?)\s*(ms|s|sec|seconds?|min|minutes?)?$/i);
      if (!match) continue;
      const value = Number(match[1]);
      const unit = (match[2] || "s").toLowerCase();
      return value * (unit === "ms" ? 1 : unit.startsWith("min") ? 60_000 : 1000);
    }
    return NaN;
  }

  _telemetryEntityIds() {
    return [...new Set([
      ...Object.values(ENTITY_MAP.before),
      ...Object.values(ENTITY_MAP.current),
      ...Object.values(ENTITY_MAP.power),
    ])];
  }

  _displayState(entityId) {
    const live = this._hass?.states?.[entityId];
    if (live && !["unknown", "unavailable", "none", ""]
      .includes(String(live.state).toLowerCase())) return live;
    const snapshot = this._telemetrySnapshot.values?.[entityId];
    return snapshot ? {
      state: snapshot.state,
      attributes: { unit_of_measurement: snapshot.unit || "" },
      last_reported: snapshot.reportedAt ? new Date(snapshot.reportedAt).toISOString() : null,
    } : live;
  }

  _stateReportedAt(state) {
    const timestamp = Date.parse(state?.last_reported || state?.last_updated || "");
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  _lastSuccessfulTelemetryAt() {
    const reported = this._telemetryEntityIds()
      .map((entityId) => this._hass?.states?.[entityId])
      .filter((state) => state && !["unknown", "unavailable", "none", ""]
        .includes(String(state.state).toLowerCase()))
      .map((state) => this._stateReportedAt(state))
      .filter(Number.isFinite);
    return Math.max(this._telemetrySnapshot.updatedAt || 0, ...reported) || null;
  }

  _captureTelemetrySnapshot() {
    if (this._connectionState() !== "local") return;
    let changed = false;
    let updatedAt = this._telemetrySnapshot.updatedAt || 0;
    const values = { ...this._telemetrySnapshot.values };
    for (const entityId of this._telemetryEntityIds()) {
      const state = this._hass?.states?.[entityId];
      if (!state || ["unknown", "unavailable", "none", ""]
        .includes(String(state.state).toLowerCase())) continue;
      const reportedAt = this._stateReportedAt(state);
      if (!reportedAt) continue;
      const nextValue = {
        state: String(state.state),
        unit: state.attributes?.unit_of_measurement || "",
        reportedAt,
      };
      const previous = values[entityId];
      values[entityId] = nextValue;
      updatedAt = Math.max(updatedAt, reportedAt);
      changed = changed || !previous || previous.state !== nextValue.state ||
        previous.unit !== nextValue.unit || previous.reportedAt !== nextValue.reportedAt;
    }
    if (!changed) return;
    this._telemetrySnapshot = { updatedAt, values };
    localStorage.setItem(TELEMETRY_SNAPSHOT_KEY, JSON.stringify(this._telemetrySnapshot));
  }

  _groupSeverity(entities, policy) {
    return this._worst(Object.values(entities).map((entity) => this._entitySeverity(entity, policy)));
  }

  _beforeSeverity(entities) {
    const telemetry = this._inputTelemetryState();
    if (telemetry === "unavailable") return "unavailable";
    if (telemetry === "phase-loss") return "emergency";
    return this._groupSeverity(entities, "before");
  }

  _inputTelemetryState() {
    const connection = this._connectionState();
    const phaseLoss = this._binaryState(ENTITY_MAP.phaseLoss);
    if (phaseLoss === "on") return "phase-loss";
    if (connection === "unknown") return "unavailable";
    return "ok";
  }

  _binaryState(entityId) {
    const state = this._hass?.states?.[entityId];
    if (!state) return null;
    const value = String(state.state).toLowerCase();
    return ["on", "off"].includes(value) ? value : null;
  }

  _entitySeverity(entity, policy) {
    const reading = this._reading(entity);
    return reading.available ? this._severity(reading.value, policy) : "unavailable";
  }

  _number(value) {
    return new Intl.NumberFormat(this._hass?.locale?.language || "ru", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  _touchStart(event) {
    const touches = event.touches;
    if (touches.length === 2) {
      event.preventDefault();
      this._suppressClicksUntil = Date.now() + 500;
      if (this._zoom.scale <= 1.03) {
        this._zoom.x = 0;
        this._zoom.y = -this._viewport.scrollTop;
        this._viewport.scrollTo({ left: 0, top: 0 });
      }
      const center = this._center(touches);
      this._gesture = {
        kind: "pinch",
        distance: this._distance(touches),
        scale: this._zoom.scale,
        worldX: (center.x - this._zoom.x) / this._zoom.scale,
        worldY: (center.y - this._zoom.y) / this._zoom.scale,
        moved: false,
        started: performance.now(),
      };
    } else if (touches.length === 1 && this._zoom.scale > 1.03 && this._canPan()) {
      this._gesture = {
        kind: "pan",
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        x: this._zoom.x,
        y: this._zoom.y,
        moved: false,
      };
    } else {
      this._gesture = null;
    }
  }

  _touchMove(event) {
    if (!this._gesture) return;
    if (event.touches.length === 2 && this._gesture.kind === "pinch") {
      event.preventDefault();
      const center = this._center(event.touches);
      const ratio = this._distance(event.touches) / Math.max(this._gesture.distance, 1);
      const scale = this._clamp(this._gesture.scale * ratio, 0.75, 2);
      this._zoom.scale = scale;
      this._zoom.x = center.x - this._gesture.worldX * scale;
      this._zoom.y = center.y - this._gesture.worldY * scale;
      this._gesture.moved = Math.abs(ratio - 1) > 0.02;
      this._applyTransform();
    } else if (event.touches.length === 1 && this._gesture.kind === "pan") {
      event.preventDefault();
      const dx = event.touches[0].clientX - this._gesture.startX;
      const dy = event.touches[0].clientY - this._gesture.startY;
      this._zoom.x = this._gesture.x + dx;
      this._zoom.y = this._gesture.y + dy;
      this._gesture.moved = Math.abs(dx) + Math.abs(dy) > 6;
      this._applyTransform();
    }
  }

  _touchEnd(event) {
    if (event.touches.length > 0) return;
    const gesture = this._gesture;
    if (!gesture) return;
    if (gesture.kind === "pinch") {
      const now = performance.now();
      if (!gesture.moved && now - gesture.started < 280) {
        if (now - this._lastTwoTap < 380) {
          this._resetZoom();
          this._lastTwoTap = 0;
        } else {
          this._lastTwoTap = now;
        }
      } else if (this._zoom.scale >= 0.97 && this._zoom.scale <= 1.03) {
        this._lastTwoTap = 0;
        this._resetZoom();
      } else {
        this._lastTwoTap = 0;
        this._saveZoom();
      }
      this._suppressClicksUntil = Date.now() + 500;
    } else {
      this._saveZoom();
      if (gesture.moved) this._suppressClicksUntil = Date.now() + 350;
    }
    this._gesture = null;
  }

  _resetZoom() {
    this._zoom = { scale: 1, x: 0, y: 0 };
    this._viewport?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    this._applyTransform();
    this._saveZoom();
    this._toast.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._toast.classList.remove("show"), 1100);
  }

  _saveZoom() {
    localStorage.setItem(ZOOM_KEY, JSON.stringify(this._zoom));
  }

  _applyTransform() {
    if (!this._canvas) return;
    const scale = this._zoom.scale;
    const viewportWidth = Math.max(1, this._viewport.clientWidth);
    const viewportHeight = Math.max(1, this._viewport.clientHeight);
    const contentWidth = Math.max(1, this._canvas.offsetWidth);
    const contentHeight = Math.max(1, this._canvas.scrollHeight);
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;

    if (Math.abs(scale - 1) < 0.001) {
      this._zoom.scale = 1;
      this._zoom.x = 0;
      this._zoom.y = 0;
    } else {
      this._zoom.x = scaledWidth <= viewportWidth
        ? (viewportWidth - scaledWidth) / 2
        : Math.min(0, Math.max(viewportWidth - scaledWidth, this._zoom.x));
      this._zoom.y = scaledHeight <= viewportHeight
        ? 0
        : Math.min(0, Math.max(viewportHeight - scaledHeight, this._zoom.y));
    }

    const zoomed = this._zoom.scale > 1.03;
    this._viewport.classList.toggle("zoomed", zoomed);
    this._canvas.style.transform =
      "translate3d(" + this._zoom.x + "px," + this._zoom.y + "px,0) scale(" + this._zoom.scale + ")";
  }

  _canPan() {
    if (!this._viewport || !this._canvas || this._zoom.scale <= 1.03) return false;
    return this._canvas.offsetWidth * this._zoom.scale > this._viewport.clientWidth + 1 ||
      this._canvas.scrollHeight * this._zoom.scale > this._viewport.clientHeight + 1;
  }

  _center(touches) {
    const rect = this._viewport.getBoundingClientRect();
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
    };
  }

  _distance(touches) {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY
    );
  }

  _clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  _styles() {
    return [
      ":host{display:block;height:100%;font-family:var(--paper-font-body1_-_font-family,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif);color:var(--primary-text-color,#17191c);background:var(--primary-background-color,#f5f6f8)}",
      "*{box-sizing:border-box}",
      "button{font:inherit;color:inherit}",
      ".app{height:100dvh;overflow:hidden;background:var(--primary-background-color,#f5f6f8)}",
      ".header{position:fixed;z-index:20;inset:0 0 auto 0;height:calc(72px + env(safe-area-inset-top));padding:env(safe-area-inset-top) max(12px,env(safe-area-inset-right)) 0 max(12px,env(safe-area-inset-left));display:grid;grid-template-columns:52px minmax(0,1fr) 52px;align-items:center;background:var(--primary-background-color,#f5f6f8);border-bottom:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 55%,transparent)}",
      ".title{text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px}",
      ".title-return{justify-self:center;min-width:min(290px,100%);max-width:100%;min-height:44px;padding:5px 14px;border:1px solid color-mix(in srgb,var(--primary-color,#03a9d9) 24%,var(--divider-color,#dfe3e8));border-radius:16px;background:color-mix(in srgb,var(--primary-color,#03a9d9) 5%,var(--card-background-color,#fff));box-shadow:0 5px 16px rgba(23,45,76,.06);cursor:pointer}",
      ".title-return:active{background:color-mix(in srgb,var(--primary-color,#03a9d9) 13%,var(--card-background-color,#fff));border-color:color-mix(in srgb,var(--primary-color,#03a9d9) 42%,var(--divider-color,#dfe3e8));box-shadow:0 2px 7px rgba(23,45,76,.05)}",
      ".title strong{font-size:23px;font-weight:800;letter-spacing:.08em;line-height:1.05;color:var(--primary-text-color,#17191c)}",
      ".title small{margin-top:3px;font-size:14px;font-weight:560;line-height:1.2;letter-spacing:.01em;color:var(--secondary-text-color,#68737d);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}",
      ".shell-button{width:44px;min-width:44px;height:44px;min-height:44px;margin:auto;padding:0;border:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 72%,transparent);background:var(--card-background-color,#fff);border-radius:16px;display:grid;place-items:center;box-shadow:0 7px 20px rgba(23,45,76,.08)}",
      ".shell-button ha-icon{--mdc-icon-size:25px;width:25px;height:25px}",
      ".menu{justify-self:start;color:var(--primary-text-color,#17191c)}",
      ".refresh{justify-self:end;color:var(--primary-color,#03a9d9)}",
      ".shell-button:active{background:color-mix(in srgb,var(--primary-color,#03a9d9) 10%,var(--card-background-color,#fff));color:var(--primary-color,#03a9d9)}",
      ".viewport{position:fixed;inset:calc(72px + env(safe-area-inset-top)) 0 calc(70px + env(safe-area-inset-bottom)) 0;overflow-x:hidden;overflow-y:auto;overscroll-behavior-x:none;touch-action:pan-y;-webkit-overflow-scrolling:touch}",
      ".viewport.zoomed{overflow:hidden;overscroll-behavior:none;touch-action:none}",
      ".canvas{width:100%;min-height:100%;transform-origin:0 0;will-change:transform;padding:14px 14px 28px}",
      ".page{width:min(100%,760px);margin:0 auto;display:grid;gap:9px}",
      ".hero,.panel-card,.thresholds{border:1px solid var(--divider-color,#dfe3e8);background:var(--card-background-color,#fff);border-radius:22px;box-shadow:var(--ha-card-box-shadow,0 2px 8px rgba(0,0,0,.07))}",
      ".hero{min-height:110px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}",
      ".hero.compact{min-height:80px;padding:12px 16px}",
      ".installation{position:relative;min-height:576px;aspect-ratio:.70;border-radius:22px;overflow:hidden;border:1px solid var(--divider-color,#dfe3e8);background:#e7e6e1 url('/lider_voltage_control_panel/assets/lider-room-background-v1.webp?v=0.3.2') center center/cover no-repeat;box-shadow:var(--ha-card-box-shadow,0 2px 8px rgba(0,0,0,.09));isolation:isolate}",
      ".installation-equipment{position:absolute;z-index:1;left:54%;bottom:1%;height:79%;width:auto;max-width:60%;object-fit:contain;transform:translateX(-50%);filter:drop-shadow(0 12px 13px rgba(26,31,35,.18));pointer-events:none;user-select:none}",
      ".installation:after{content:'';position:absolute;z-index:2;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.17),transparent 28%,transparent 78%,rgba(20,24,28,.18));pointer-events:none}",
      ".scene-heading{position:absolute;z-index:4;left:18px;top:16px;max-width:45%;text-shadow:0 1px 7px rgba(255,255,255,.95)}",
      ".scene-heading h1{font-size:22px;line-height:1.02;margin-top:3px}",
      ".scene-heading p{margin-top:3px;color:#4d555d;font-size:12px;line-height:1.2}",
      ".overall{position:absolute;z-index:5;right:14px;top:16px;min-width:144px;padding:12px 14px;border:1px solid;border-radius:18px;display:grid;grid-template-columns:10px minmax(0,auto);grid-template-rows:auto auto;align-items:center;column-gap:11px;row-gap:2px;text-align:left;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.09)}",
      ".status-lamp{grid-column:1;grid-row:1;width:10px;height:10px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px color-mix(in srgb,currentColor 18%,transparent),0 0 8px color-mix(in srgb,currentColor 58%,transparent)}",
      ".status-main{grid-column:2;grid-row:1;font-size:16px;font-weight:700;line-height:1.15}",
      ".status-sub{grid-column:2;grid-row:2;font-size:13px;font-weight:550;line-height:1.2}",
      ".status-sub.freshness-current{color:var(--secondary-text-color,#68737d)}",
      ".status-sub.freshness-stale{color:var(--warning-color,#ed8b00)}",
      ".status-sub.freshness-unknown{color:var(--disabled-text-color,#9aa0a6)}",
      ".scene-phase{position:absolute;z-index:5;width:29%;display:grid;grid-template-columns:1fr;gap:5px;padding:8px;border:1px solid rgba(255,255,255,.76);border-radius:16px;background:rgba(255,255,255,.91);box-shadow:0 5px 16px rgba(40,48,56,.14);backdrop-filter:blur(9px)}",
      ".scene-phase.side-input{left:10px;width:31%}",
      ".scene-phase.side-output{right:10px}",
      ".scene-phase>strong{font-size:12px;line-height:1.15;text-align:center}",
      ".side-input.phase-a{top:34%}.side-input.phase-b{top:53%}.side-input.phase-c{top:72%}",
      ".side-output.phase-a{top:35%}.side-output.phase-b{top:53%}.side-output.phase-c{top:71%}",
      ".input-metrics{min-width:0;display:grid;grid-template-columns:.92fr 1.08fr;gap:5px}",
      ".scene-reading{min-width:0;border:0;border-radius:10px;padding:6px 4px;display:flex;flex-direction:column;gap:2px;align-items:center}",
      ".scene-reading span{font-size:12px;color:var(--secondary-text-color,#69737d)}",
      ".scene-reading b{font-size:12px;white-space:nowrap}",
      ".scene-power{min-width:0;border:0;border-radius:10px;padding:6px 3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:color-mix(in srgb,var(--primary-color,#03a9d9) 8%,#fff)}",
      ".scene-power span{font-size:12px;color:var(--secondary-text-color,#69737d)}.scene-power b{font-size:12px;white-space:nowrap}",
      ".installation-caption{position:absolute;z-index:4;left:16px;right:16px;bottom:13px;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;color:#fff;text-shadow:0 2px 7px rgba(0,0,0,.8)}",
      ".installation-caption span{font-size:12px;letter-spacing:.1em;font-weight:750}",
      ".installation-caption strong{font-size:13px}.installation-caption span,.installation-caption strong{white-space:nowrap}",
      ".eyebrow{font-size:12px;letter-spacing:.1em;color:var(--secondary-text-color,#68737d);font-weight:750}",
      "h1,h2,p{margin:0}",
      "h1{font-size:25px;margin-top:5px}",
      "h2{font-size:17px}",
      ".hero-title h1{margin-top:0}",
      ".hero p,.line-card p,.line-focus p,.note{margin-top:7px;color:var(--secondary-text-color,#68737d);font-size:13px;line-height:1.4}",
      ".badge{padding:8px 11px;border-radius:999px;font-weight:750;font-size:12px;text-align:center;white-space:nowrap}",
      ".panel-card{padding:11px}",
      ".section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}",
      ".phase-grid,.detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}",
      ".phase-telemetry-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}",
      ".phase-telemetry-column{min-width:0;display:grid;grid-template-rows:auto repeat(3,minmax(68px,auto));gap:5px}",
      ".phase-telemetry-column h2{text-align:center;font-size:13px;line-height:1.2}",
      ".metric{min-width:0;min-height:76px;padding:7px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid var(--divider-color,#dfe3e8);border-radius:15px;background:color-mix(in srgb,var(--secondary-text-color,#68737d) 5%,var(--card-background-color,#fff))}",
      ".metric.large{min-height:94px}",
      ".metric.phase-measurement{min-height:68px}",
      ".metric-label{color:var(--secondary-text-color,#68737d);font-size:12px}",
      ".metric strong{font-size:20px}",
      ".metric small{font-size:12px;line-height:1.2}",
      ".diagnostic-section{display:grid;gap:6px}",
      ".diagnostic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}",
      ".diagnostic-metric{min-width:0;min-height:50px;border:1px solid var(--divider-color,#dfe3e8);border-radius:13px;background:color-mix(in srgb,var(--secondary-text-color,#68737d) 4%,var(--card-background-color,#fff));padding:6px 8px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;text-align:left}",
      ".diagnostic-metric span{width:100%;font-size:12px;color:var(--secondary-text-color,#68737d);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.diagnostic-metric strong{font-size:14px}",
      ".history-periods{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}",
      ".history-periods button{min-width:0;min-height:42px;padding:6px 4px;border:1px solid var(--divider-color,#dfe3e8);border-radius:13px;background:transparent;color:var(--secondary-text-color,#68737d);font:inherit;font-size:12px;font-weight:700;line-height:1.15}",
      ".history-periods button.active{color:var(--primary-color,#03a9d9);border-color:color-mix(in srgb,var(--primary-color,#03a9d9) 32%,var(--divider-color,#dfe3e8));background:color-mix(in srgb,var(--primary-color,#03a9d9) 9%,var(--card-background-color,#fff))}",
      ".history-card-host{min-width:0}.history-card-host>ha-card{margin:0}",
      ".history-group{display:grid;gap:8px;padding:11px}.history-group>h2{padding:2px 3px 1px;font-size:18px}",
      ".history-group .history-card-host>ha-card{box-shadow:none;border:1px solid var(--divider-color,#dfe3e8);border-radius:15px;overflow:hidden}",
      ".history-loading{min-height:150px;padding:18px;border:1px solid var(--divider-color,#dfe3e8);border-radius:20px;background:var(--card-background-color,#fff);display:grid;place-items:center;color:var(--secondary-text-color,#68737d);font-size:13px}",
      ".flow{text-align:center;color:var(--primary-color,#03a9d9);font-size:12px;letter-spacing:.08em;padding:1px}",
      ".line-card{display:grid;grid-template-columns:1fr 145px;align-items:center;gap:10px}",
      ".line-focus{display:grid;gap:7px;text-align:center}",
      ".thresholds{padding:11px}",
      ".thresholds p{margin-top:6px;color:var(--secondary-text-color,#68737d);font-size:13px;line-height:1.4}",
      ".note{text-align:center;padding:0 8px 10px}",
      ".diagnostics-page{padding-bottom:6px}",
      ".diagnostics-hero .hero-title{min-width:0}.diagnostics-hero p{margin-top:4px;font-size:13px;color:var(--secondary-text-color,#68737d)}",
      ".raw-group{padding:12px;display:grid;gap:9px}",
      ".raw-group-head{align-items:flex-start}.raw-group-head>div{min-width:0}.raw-group-head p{margin:3px 0 0;font-size:13px;line-height:1.35;color:var(--secondary-text-color,#68737d)}",
      ".raw-count{min-width:28px;height:28px;padding:0 7px;border:1px solid var(--divider-color,#dfe3e8);border-radius:999px;display:grid;place-items:center;font-size:12px;font-weight:750;color:var(--secondary-text-color,#68737d)}",
      ".raw-entities{display:grid;gap:8px}",
      ".raw-entity{min-width:0;border:1px solid var(--divider-color,#dfe3e8);border-radius:16px;background:color-mix(in srgb,var(--secondary-text-color,#68737d) 3%,var(--card-background-color,#fff));padding:10px;display:grid;gap:8px;cursor:pointer;outline:none}",
      ".raw-entity:focus-visible{border-color:var(--primary-color,#03a9d9);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color,#03a9d9) 18%,transparent)}",
      ".raw-entity-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.raw-entity-head>div{min-width:0}.raw-entity-head h3{margin:0;font-size:15px;line-height:1.25}.raw-entity-head code{display:block;margin-top:3px;font-size:12px;color:var(--secondary-text-color,#68737d);white-space:normal;overflow-wrap:anywhere}.raw-entity-head ha-icon{flex:0 0 auto;--mdc-icon-size:20px;color:var(--secondary-text-color,#68737d)}",
      ".raw-list{display:grid;border-top:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 75%,transparent)}",
      ".raw-row{min-width:0;display:grid;grid-template-columns:minmax(108px,.8fr) minmax(0,1.4fr);gap:10px;padding:7px 2px;border-bottom:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 55%,transparent)}",
      ".raw-row span{font-size:12px;color:var(--secondary-text-color,#68737d);overflow-wrap:anywhere}.raw-row strong{min-width:0;font-size:13px;font-weight:650;text-align:right;overflow-wrap:anywhere;word-break:break-word}.raw-state strong{font-size:15px;color:var(--primary-text-color,#17191c)}",
      ".raw-empty{margin:0;padding:8px 2px;font-size:13px;color:var(--secondary-text-color,#68737d)}",
      ".normal{color:var(--success-color,#2e7d32);background:color-mix(in srgb,var(--success-color,#2e7d32) 11%,#fff);border-color:color-mix(in srgb,var(--success-color,#2e7d32) 30%,transparent)}",
      ".attention{color:var(--warning-color,#ed8b00);background:color-mix(in srgb,var(--warning-color,#ed8b00) 12%,#fff);border-color:color-mix(in srgb,var(--warning-color,#ed8b00) 32%,transparent)}",
      ".significant{color:#d96500;background:#fff1e5;border-color:#efad71}",
      ".emergency{color:var(--error-color,#d32f2f);background:color-mix(in srgb,var(--error-color,#d32f2f) 10%,#fff);border-color:color-mix(in srgb,var(--error-color,#d32f2f) 30%,transparent)}",
      ".neutral{color:var(--primary-text-color,#17191c);background:color-mix(in srgb,var(--primary-color,#03a9d9) 6%,var(--card-background-color,#fff));border-color:color-mix(in srgb,var(--primary-color,#03a9d9) 18%,var(--divider-color,#dfe3e8))}",
      ".unavailable{color:var(--secondary-text-color,#68737d);background:color-mix(in srgb,var(--secondary-text-color,#68737d) 8%,#fff);border-color:var(--divider-color,#dfe3e8)}",
      ".overall.unavailable{color:var(--disabled-text-color,#9aa0a6)}",
      ".tabs{position:fixed;z-index:20;inset:auto 0 0 0;height:calc(70px + env(safe-area-inset-bottom));padding:6px max(6px,env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:2px;background:var(--card-background-color,#fff);border-top:1px solid var(--divider-color,#dfe3e8);box-shadow:0 -5px 22px rgba(23,45,76,.08)}",
      ".tabs button{min-width:0;min-height:58px;padding:4px 2px;border:0;background:transparent;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--secondary-text-color,#68737d);font-size:12px;font-weight:700;line-height:1.1;overflow:hidden}",
      ".tabs button ha-icon{--mdc-icon-size:28px;width:28px;height:28px}",
      ".tabs button small{display:block;max-width:100%;font-size:12px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".tabs button.active{color:var(--primary-color,#03a9d9);background:color-mix(in srgb,var(--primary-color,#03a9d9) 9%,var(--card-background-color,#fff))}",
      ".zoom-toast{position:fixed;z-index:40;left:50%;top:calc(78px + env(safe-area-inset-top));transform:translate(-50%,-12px);opacity:0;padding:8px 13px;border-radius:999px;background:rgba(30,34,38,.9);color:#fff;font-size:12px;transition:.2s;pointer-events:none}",
      ".zoom-toast.show{opacity:1;transform:translate(-50%,0)}",
      "@media (max-width:420px){.title-return{min-width:0;width:100%;padding-inline:8px}.title strong{font-size:21px}.title small{font-size:13px}.canvas{padding:10px 10px 24px}.hero{padding:14px}.hero.compact{padding:10px 14px}.hero h1{font-size:22px}.installation{min-height:600px}.installation-equipment{left:55%;bottom:1%;height:79%;max-width:60%}.scene-heading{max-width:44%}.scene-heading h1{font-size:19px}.scene-phase{width:29%;padding:7px 5px}.scene-phase.side-input{left:7px;width:32%}.scene-phase.side-output{right:7px}.input-metrics{gap:3px}.scene-reading b,.scene-power b{font-size:12px}.installation-caption{left:12px;right:12px;bottom:11px}.installation-caption span{font-size:12px}.installation-caption strong{font-size:12px}.metric strong{font-size:18px}.line-card{grid-template-columns:1fr 128px}.badge{white-space:normal}.overall{min-width:140px;white-space:nowrap}.raw-row{grid-template-columns:minmax(96px,.75fr) minmax(0,1.25fr)}}",
    ].join("");
  }
}

if (!customElements.get("lider-voltage-control-panel")) {
  customElements.define("lider-voltage-control-panel", LiderVoltageControlPanel);
}
