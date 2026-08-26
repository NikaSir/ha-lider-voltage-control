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
  lineUniqueId: "W0035313411160_input_voltage",
  meterOnline: "binary_sensor.power_meter_online",
  phaseLoss: "binary_sensor.power_phase_loss",
});

const ZOOM_KEY = "nikas.lider.zoom.v1";
const VIEW_KEY = "nikas.lider.view.v1";

class LiderVoltageControlPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._view = localStorage.getItem(VIEW_KEY) || "overview";
    this._zoom = this._loadZoom();
    this._gesture = null;
    this._lastTwoTap = 0;
    this._toastTimer = null;
    this._lineEntityId = null;
    this._registryLoaded = false;
    this._registryLoading = false;
    this._diagnosticEntities = { before: [], after: { A: [], B: [], C: [] }, line: [] };
  }

  set hass(value) {
    this._hass = value;
    if (!this._mounted) {
      this._mount();
    }
    if (!this._registryLoaded && !this._registryLoading) {
      this._resolveRegistryEntities();
    }
    this._renderContent();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (!this._mounted) this._mount();
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
      this._renderContent();
    }
  }

  _diagnosticDomain(entityId) {
    return entityId?.startsWith("sensor.") || entityId?.startsWith("binary_sensor.");
  }

  _mount() {
    this._mounted = true;
    this.shadowRoot.innerHTML =
      '<style>' + this._styles() + '</style>' +
      '<div class="app">' +
        '<header class="header">' +
          '<button class="shell-button menu" aria-label="Меню Home Assistant">☰</button>' +
          '<div class="title"><strong>LIDER</strong><small>Voltage Control · UI v0.2.2</small></div>' +
          '<button class="shell-button refresh" aria-label="Обновить">↻</button>' +
        '</header>' +
        '<main class="viewport">' +
          '<section class="canvas"></section>' +
        '</main>' +
        '<nav class="tabs">' +
          this._tabButton("overview", "⌂", "Обзор") +
          this._tabButton("before", "⇥", "До LIDER") +
          this._tabButton("after", "⇤", "После") +
          this._tabButton("line", "ϟ", "Линия") +
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
      this._renderContent();
    });
    this.shadowRoot.querySelector(".tabs").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (!button) return;
      this._view = button.dataset.view;
      localStorage.setItem(VIEW_KEY, this._view);
      this._zoom.x = 0;
      this._zoom.y = 0;
      this._renderContent();
    });
    this._canvas.addEventListener("click", (event) => {
      const target = event.target.closest("[data-entity]");
      if (!target || this._gesture?.moved) return;
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
    window.addEventListener("resize", () => this._applyTransform());
    this._renderContent();
  }

  _tabButton(view, icon, label) {
    return '<button data-view="' + view + '"><span>' + icon + '</span><small>' + label + '</small></button>';
  }

  _renderContent() {
    if (!this._canvas) return;
    const renderers = {
      overview: () => this._overview(),
      before: () => this._detailGroup("До стабилизаторов", ENTITY_MAP.before, "before"),
      after: () => this._detailGroup("После стабилизаторов", ENTITY_MAP.after, "quality"),
      line: () => this._lineView(),
    };
    this._canvas.innerHTML = (renderers[this._view] || renderers.overview)();
    this.shadowRoot.querySelectorAll(".tabs button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === this._view);
    });
    requestAnimationFrame(() => this._applyTransform());
  }

  _overview() {
    return '<div class="page">' +
      '<section class="installation" role="img" aria-label="Три стабилизатора LIDER PS7500W-15 на стойке с внешним пофазным байпасом">' +
        '<div class="scene-heading"><span class="eyebrow">ЭЛЕКТРОСЕТЬ</span><h1>Контроль электросети</h1>' +
          '<p>Вход → LIDER → домашняя сеть</p></div>' +
        '<div class="overall ' + this._overallClass() + '">' + this._overallLabel() + '</div>' +
        '<img class="installation-equipment" src="/lider_voltage_control_panel/assets/lider-rack-ps22w30-v2.webp?v=0.2.2" alt="" aria-hidden="true" loading="eager" decoding="sync">' +
        this._scenePhase("A", "phase-a") +
        this._scenePhase("B", "phase-b") +
        this._scenePhase("C", "phase-c") +
        '<div class="installation-caption"><span>LIDER PS7500W-15 · 3 шт.</span><strong>Стойка 9-36 · пофазный байпас</strong></div>' +
      '</section>' +
      this._lineCard() +
      '<p class="note">Нажатие на напряжение открывает стандартную историю Home Assistant.</p>' +
    '</div>';
  }

  _scenePhase(phase, positionClass) {
    const inputEntity = ENTITY_MAP.before[phase];
    const outputEntity = ENTITY_MAP.after[phase];
    return '<div class="scene-phase ' + positionClass + '">' +
      '<strong>Фаза ' + phase + '</strong>' +
      this._sceneReading("Вход", inputEntity, "before") +
      this._sceneReading("Выход", outputEntity, "quality") +
      this._scenePower(ENTITY_MAP.power[phase]) +
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
      '<section class="hero compact"><div><span class="eyebrow">LIDER</span><h1>' + title + '</h1></div>' +
      this._groupBadge(entities, policy) + '</section>' +
      '<section class="panel-card detail-grid">' +
        ["A", "B", "C"].map((phase) => this._metricCard("Фаза " + phase, entities[phase], policy, true)).join("") +
      '</section>' +
      (policy === "before"
        ? '<section class="panel-card"><div class="section-head"><h2>Мощность по фазам</h2></div><div class="diagnostic-grid">' +
            ["A", "B", "C"].map((phase) => this._diagnosticCard(ENTITY_MAP.power[phase], "Фаза " + phase)).join("") +
          '</div></section>' +
          this._diagnosticSection("Диагностика входного измерителя", this._diagnosticEntities.before,
            [...Object.values(entities), ...Object.values(ENTITY_MAP.power)])
        : ["A", "B", "C"].map((phase) =>
            this._diagnosticSection("Диагностика розетки · фаза " + phase,
              this._diagnosticEntities.after[phase], [entities[phase]])
          ).join("")) +
      '<section class="thresholds"><h2>Граничные значения</h2><p>' + thresholds + '</p></section>' +
      (policy === "quality" ? '<p class="note">Выходные A/B/C — подтверждённые временные контрольные точки старой панели. Постоянные датчики заменят их без изменения интерфейса.</p>' : '') +
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
      .filter((entityId) => !excludedSet.has(entityId) && this._hass?.states?.[entityId]);
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

  _stateText(entityId) {
    const state = this._hass?.states?.[entityId];
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
    const state = this._hass?.states?.[entityId];
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
    const order = ["normal", "attention", "significant", "emergency", "unavailable"];
    if (values.includes("unavailable")) return "unavailable";
    return values.reduce((worst, value) => order.indexOf(value) > order.indexOf(worst) ? value : worst, "normal");
  }

  _overallClass() {
    return this._meterIsOnline() ? "normal" : "emergency";
  }

  _overallLabel() {
    return this._meterIsOnline() ? "Online" : "Offline";
  }

  _meterIsOnline() {
    const meter = this._binaryState(ENTITY_MAP.meterOnline);
    if (meter === "on") return true;
    if (meter === "off") return false;
    return Object.values(ENTITY_MAP.before).some((entityId) => this._reading(entityId).available);
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
    const meter = this._binaryState(ENTITY_MAP.meterOnline);
    const phaseLoss = this._binaryState(ENTITY_MAP.phaseLoss);
    if (meter === null || phaseLoss === null || meter !== "on") return "unavailable";
    return phaseLoss === "on" ? "phase-loss" : "ok";
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
    event.preventDefault();
    const touches = event.touches;
    if (touches.length === 2) {
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
    } else if (touches.length === 1) {
      this._gesture = {
        kind: "pan",
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        x: this._zoom.x,
        y: this._zoom.y,
        moved: false,
      };
    }
  }

  _touchMove(event) {
    event.preventDefault();
    if (!this._gesture) return;
    if (event.touches.length === 2 && this._gesture.kind === "pinch") {
      const center = this._center(event.touches);
      const ratio = this._distance(event.touches) / Math.max(this._gesture.distance, 1);
      const scale = this._clamp(this._gesture.scale * ratio, 0.75, 2);
      this._zoom.scale = scale;
      this._zoom.x = center.x - this._gesture.worldX * scale;
      this._zoom.y = center.y - this._gesture.worldY * scale;
      this._gesture.moved = Math.abs(ratio - 1) > 0.02;
      this._applyTransform();
    } else if (event.touches.length === 1 && this._gesture.kind === "pan") {
      const dx = event.touches[0].clientX - this._gesture.startX;
      const dy = event.touches[0].clientY - this._gesture.startY;
      this._zoom.x = this._gesture.x + dx;
      this._zoom.y = this._gesture.y + dy;
      this._gesture.moved = Math.abs(dx) + Math.abs(dy) > 6;
      this._applyTransform();
    }
  }

  _touchEnd(event) {
    event.preventDefault();
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
        this._resetZoom();
      } else {
        this._saveZoom();
      }
    } else {
      this._saveZoom();
    }
    if (event.touches.length === 0) this._gesture = null;
  }

  _resetZoom() {
    this._zoom = { scale: 1, x: 0, y: 0 };
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
    this._canvas.style.transform =
      "translate3d(" + this._zoom.x + "px," + this._zoom.y + "px,0) scale(" + this._zoom.scale + ")";
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
      ".header{position:fixed;z-index:20;inset:0 0 auto 0;height:calc(64px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 12px 0;display:grid;grid-template-columns:58px 1fr 58px;align-items:center;background:color-mix(in srgb,var(--primary-background-color,#f5f6f8) 94%,transparent);border-bottom:1px solid var(--divider-color,#dfe3e8);backdrop-filter:blur(18px)}",
      ".title{text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px}",
      ".title strong{font-size:22px;font-weight:800;letter-spacing:.08em;line-height:1}",
      ".title small{font-size:10px;font-weight:500;letter-spacing:.02em;color:var(--secondary-text-color,#68737d)}",
      ".shell-button{width:48px;height:48px;margin:auto;border:1px solid var(--divider-color,#dfe3e8);background:var(--card-background-color,#fff);font-size:27px;border-radius:15px;box-shadow:var(--ha-card-box-shadow,0 2px 7px rgba(0,0,0,.09))}",
      ".shell-button:active{background:color-mix(in srgb,var(--primary-color,#03a9d9) 10%,var(--card-background-color,#fff));color:var(--primary-color,#03a9d9)}",
      ".viewport{position:fixed;inset:calc(64px + env(safe-area-inset-top)) 0 calc(70px + env(safe-area-inset-bottom)) 0;overflow:hidden;touch-action:none}",
      ".canvas{width:100%;min-height:100%;transform-origin:0 0;will-change:transform;padding:14px 14px 28px}",
      ".page{width:min(100%,760px);margin:0 auto;display:grid;gap:12px}",
      ".hero,.panel-card,.thresholds{border:1px solid var(--divider-color,#dfe3e8);background:var(--card-background-color,#fff);border-radius:22px;box-shadow:var(--ha-card-box-shadow,0 2px 8px rgba(0,0,0,.07))}",
      ".hero{min-height:126px;padding:20px;display:flex;align-items:center;justify-content:space-between;gap:16px}",
      ".hero.compact{min-height:104px}",
      ".installation{position:relative;min-height:520px;aspect-ratio:.78;border-radius:22px;overflow:hidden;border:1px solid var(--divider-color,#dfe3e8);background:#e7e6e1 url('/lider_voltage_control_panel/assets/lider-room-background-v1.webp?v=0.2.2') center center/cover no-repeat;box-shadow:var(--ha-card-box-shadow,0 2px 8px rgba(0,0,0,.09));isolation:isolate}",
      ".installation-equipment{position:absolute;z-index:1;left:67%;bottom:3%;height:82%;width:auto;max-width:68%;object-fit:contain;transform:translateX(-50%);filter:drop-shadow(0 12px 13px rgba(26,31,35,.18));pointer-events:none;user-select:none}",
      ".installation:after{content:'';position:absolute;z-index:2;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.17),transparent 28%,transparent 78%,rgba(20,24,28,.18));pointer-events:none}",
      ".scene-heading{position:absolute;z-index:4;left:18px;top:18px;max-width:62%;text-shadow:0 1px 7px rgba(255,255,255,.95)}",
      ".scene-heading p{margin-top:4px;color:#4d555d;font-size:12px}",
      ".overall{position:absolute;z-index:5;right:14px;top:16px;padding:8px 11px;border-radius:999px;font-weight:750;font-size:12px;text-align:center;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.09)}",
      ".scene-phase{position:absolute;z-index:5;left:14px;width:43%;display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:8px;border:1px solid rgba(255,255,255,.72);border-radius:16px;background:rgba(255,255,255,.9);box-shadow:0 5px 16px rgba(40,48,56,.14);backdrop-filter:blur(9px)}",
      ".scene-phase>strong{grid-column:1/-1;font-size:12px;padding-left:3px}",
      ".phase-a{top:33%}.phase-b{top:51%}.phase-c{top:69%}",
      ".scene-reading{min-width:0;border:0;border-radius:10px;padding:6px 4px;display:flex;flex-direction:column;gap:2px;align-items:center}",
      ".scene-reading span{font-size:9px;color:var(--secondary-text-color,#69737d)}",
      ".scene-reading b{font-size:12px;white-space:nowrap}",
      ".scene-power{grid-column:1/-1;border:0;border-radius:10px;padding:6px 8px;display:flex;align-items:center;justify-content:space-between;background:color-mix(in srgb,var(--primary-color,#03a9d9) 8%,#fff)}",
      ".scene-power span{font-size:9px;color:var(--secondary-text-color,#69737d)}.scene-power b{font-size:12px;white-space:nowrap}",
      ".installation-caption{position:absolute;z-index:4;left:50%;right:14px;bottom:14px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right;color:#fff;text-shadow:0 2px 7px rgba(0,0,0,.8)}",
      ".installation-caption span{font-size:11px;letter-spacing:.14em;font-weight:750}",
      ".installation-caption strong{font-size:13px}",
      ".eyebrow{font-size:11px;letter-spacing:.13em;color:var(--secondary-text-color,#68737d);font-weight:750}",
      "h1,h2,p{margin:0}",
      "h1{font-size:25px;margin-top:5px}",
      "h2{font-size:17px}",
      ".hero p,.line-card p,.line-focus p,.note{margin-top:7px;color:var(--secondary-text-color,#68737d);font-size:13px;line-height:1.4}",
      ".badge{padding:8px 11px;border-radius:999px;font-weight:750;font-size:12px;text-align:center;white-space:nowrap}",
      ".panel-card{padding:15px}",
      ".section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}",
      ".phase-grid,.detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}",
      ".metric{min-width:0;min-height:104px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1px solid var(--divider-color,#dfe3e8);border-radius:17px;background:color-mix(in srgb,var(--secondary-text-color,#68737d) 5%,var(--card-background-color,#fff))}",
      ".metric.large{min-height:146px}",
      ".metric-label{color:var(--secondary-text-color,#68737d);font-size:12px}",
      ".metric strong{font-size:20px}",
      ".metric small{font-size:10px;line-height:1.2}",
      ".diagnostic-section{display:grid;gap:2px}",
      ".diagnostic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
      ".diagnostic-metric{min-width:0;min-height:62px;border:1px solid var(--divider-color,#dfe3e8);border-radius:14px;background:color-mix(in srgb,var(--secondary-text-color,#68737d) 4%,var(--card-background-color,#fff));padding:9px 10px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;text-align:left}",
      ".diagnostic-metric span{width:100%;font-size:10px;color:var(--secondary-text-color,#68737d);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.diagnostic-metric strong{font-size:14px}",
      ".flow{text-align:center;color:var(--primary-color,#03a9d9);font-size:12px;letter-spacing:.08em;padding:1px}",
      ".line-card{display:grid;grid-template-columns:1fr 145px;align-items:center;gap:10px}",
      ".line-focus{display:grid;gap:13px;text-align:center}",
      ".thresholds{padding:16px}",
      ".thresholds p{margin-top:8px;color:var(--secondary-text-color,#68737d);font-size:13px;line-height:1.55}",
      ".note{text-align:center;padding:0 10px 18px}",
      ".normal{color:var(--success-color,#2e7d32);background:color-mix(in srgb,var(--success-color,#2e7d32) 11%,#fff);border-color:color-mix(in srgb,var(--success-color,#2e7d32) 30%,transparent)}",
      ".attention{color:var(--warning-color,#ed8b00);background:color-mix(in srgb,var(--warning-color,#ed8b00) 12%,#fff);border-color:color-mix(in srgb,var(--warning-color,#ed8b00) 32%,transparent)}",
      ".significant{color:#d96500;background:#fff1e5;border-color:#efad71}",
      ".emergency{color:var(--error-color,#d32f2f);background:color-mix(in srgb,var(--error-color,#d32f2f) 10%,#fff);border-color:color-mix(in srgb,var(--error-color,#d32f2f) 30%,transparent)}",
      ".unavailable{color:var(--secondary-text-color,#68737d);background:color-mix(in srgb,var(--secondary-text-color,#68737d) 8%,#fff);border-color:var(--divider-color,#dfe3e8)}",
      ".tabs{position:fixed;z-index:20;inset:auto 0 0 0;height:calc(70px + env(safe-area-inset-bottom));padding:4px 7px env(safe-area-inset-bottom);display:grid;grid-template-columns:repeat(4,1fr);background:color-mix(in srgb,var(--primary-background-color,#f5f6f8) 95%,transparent);border-top:1px solid var(--divider-color,#dfe3e8);backdrop-filter:blur(18px)}",
      ".tabs button{border:0;background:transparent;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--secondary-text-color,#68737d);min-height:58px}",
      ".tabs button span{font-size:22px;line-height:1}",
      ".tabs button small{font-size:10px}",
      ".tabs button.active{color:var(--primary-color,#03a9d9);background:color-mix(in srgb,var(--primary-color,#03a9d9) 12%,transparent)}",
      ".zoom-toast{position:fixed;z-index:40;left:50%;top:calc(78px + env(safe-area-inset-top));transform:translate(-50%,-12px);opacity:0;padding:8px 13px;border-radius:999px;background:rgba(30,34,38,.9);color:#fff;font-size:12px;transition:.2s;pointer-events:none}",
      ".zoom-toast.show{opacity:1;transform:translate(-50%,0)}",
      "@media (max-width:420px){.canvas{padding:10px 10px 24px}.hero{padding:16px}.hero h1{font-size:22px}.installation{min-height:540px}.installation-equipment{left:68%;height:81%;max-width:69%}.scene-heading h1{font-size:21px}.scene-phase{left:10px;width:45%;padding:7px}.metric strong{font-size:18px}.line-card{grid-template-columns:1fr 128px}.badge,.overall{white-space:normal}}",
    ].join("");
  }
}

if (!customElements.get("lider-voltage-control-panel")) {
  customElements.define("lider-voltage-control-panel", LiderVoltageControlPanel);
}
