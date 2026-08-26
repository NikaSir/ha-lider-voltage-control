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
  line: "sensor.socket_zb_25_voltage",
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
  }

  set hass(value) {
    this._hass = value;
    if (!this._mounted) {
      this._mount();
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

  _mount() {
    this._mounted = true;
    this.shadowRoot.innerHTML =
      '<style>' + this._styles() + '</style>' +
      '<div class="app">' +
        '<header class="header">' +
          '<button class="shell-button menu" aria-label="Меню Home Assistant">☰</button>' +
          '<div class="title">LIDER</div>' +
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
      '<section class="hero">' +
        '<div><span class="eyebrow">ЭЛЕКТРОСЕТЬ</span><h1>Контроль стабилизации</h1>' +
        '<p>Входящая сеть → LIDER → домашняя сеть</p></div>' +
        '<div class="overall ' + this._overallClass() + '">' + this._overallLabel() + '</div>' +
      '</section>' +
      '<section class="installation" role="img" aria-label="Трёхфазный комплект LIDER PS22W-30: три стабилизатора PS7500W-30 на стойке с внешним байпасом">' +
        '<img class="installation-equipment" src="/lider_voltage_control_panel/assets/lider-rack-ps22w30-v1.png?v=0.1.3" alt="" aria-hidden="true" loading="eager" decoding="async">' +
        '<div class="installation-caption"><span>LIDER PS22W-30</span><strong>Стойка 9-36 · пофазный байпас</strong></div>' +
      '</section>' +
      this._summarySection("1. До стабилизаторов", ENTITY_MAP.before, "before") +
      '<div class="flow">↓ стабилизация LIDER ↓</div>' +
      this._summarySection("2. После стабилизаторов", ENTITY_MAP.after, "quality") +
      this._lineCard() +
      '<p class="note">Нажатие на измерение открывает стандартный more-info Home Assistant.</p>' +
    '</div>';
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
      '<section class="thresholds"><h2>Граничные значения</h2><p>' + thresholds + '</p></section>' +
      (policy === "quality" ? '<p class="note">Выходные A/B/C — подтверждённые временные контрольные точки старой панели. Постоянные датчики заменят их без изменения интерфейса.</p>' : '') +
    '</div>';
  }

  _lineView() {
    return '<div class="page">' +
      '<section class="hero compact"><div><span class="eyebrow">ОТДЕЛЬНЫЙ ОБЪЕКТ</span><h1>Неотключаемая линия</h1>' +
      '<p>После переключателя фаз; не является четвёртой фазой</p></div>' +
      this._entityBadge(ENTITY_MAP.line, "quality") + '</section>' +
      '<section class="panel-card line-focus">' +
        this._metricCard("Напряжение линии", ENTITY_MAP.line, "quality", true) +
        '<p>Источник: розетка пневматического компрессора в гараже.</p>' +
      '</section>' +
      '<section class="thresholds"><h2>Граничные значения</h2>' +
      '<p>Норма 210–230 В · внимание 205–210 / 230–235 В · существенно 198–205 / 235–242 В · авария &lt;198 / &gt;242 В.</p></section>' +
    '</div>';
  }

  _lineCard() {
    return '<section class="panel-card line-card">' +
      '<div><span class="eyebrow">3. НЕОТКЛЮЧАЕМАЯ ЛИНИЯ</span><h2>Отдельный контроль</h2>' +
      '<p>Розетка компрессора · после переключателя фаз</p></div>' +
      this._metricCard("Напряжение", ENTITY_MAP.line, "quality") +
    '</section>';
  }

  _metricCard(label, entityId, policy, large = false) {
    const reading = this._reading(entityId);
    const inputAvailable = policy !== "before" || this._inputTelemetryState() === "ok";
    const available = reading.available && inputAvailable;
    const severity = available ? this._severity(reading.value, policy) : "unavailable";
    return '<button class="metric ' + severity + (large ? ' large' : '') + '" data-entity="' + entityId + '">' +
      '<span class="metric-label">' + label + '</span>' +
      '<strong>' + (available ? this._number(reading.value) + ' В' : 'Нет данных') + '</strong>' +
      '<small>' + this._severityLabel(severity) + '</small>' +
    '</button>';
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
    const groups = [
      this._beforeSeverity(ENTITY_MAP.before),
      this._groupSeverity(ENTITY_MAP.after, "quality"),
      this._entitySeverity(ENTITY_MAP.line, "quality"),
    ];
    return this._worst(groups);
  }

  _overallLabel() {
    return this._severityLabel(this._overallClass());
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
      ":host{display:block;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f4f7fb;background:#07101b}",
      "*{box-sizing:border-box}",
      "button{font:inherit;color:inherit}",
      ".app{height:100dvh;overflow:hidden;background:radial-gradient(circle at 20% 0%,#173450 0,#0a1725 42%,#050b12 100%)}",
      ".header{position:fixed;z-index:20;inset:0 0 auto 0;height:calc(58px + env(safe-area-inset-top));padding-top:env(safe-area-inset-top);display:grid;grid-template-columns:58px 1fr 58px;align-items:center;background:rgba(6,14,24,.92);border-bottom:1px solid rgba(151,195,230,.16);backdrop-filter:blur(18px)}",
      ".title{text-align:center;font-size:20px;font-weight:750;letter-spacing:.08em}",
      ".shell-button{width:48px;height:48px;margin:auto;border:0;background:transparent;font-size:27px;border-radius:14px}",
      ".shell-button:active{background:rgba(255,255,255,.1)}",
      ".viewport{position:fixed;inset:calc(58px + env(safe-area-inset-top)) 0 calc(70px + env(safe-area-inset-bottom)) 0;overflow:hidden;touch-action:none}",
      ".canvas{width:100%;min-height:100%;transform-origin:0 0;will-change:transform;padding:14px 14px 28px}",
      ".page{width:min(100%,760px);margin:0 auto;display:grid;gap:12px}",
      ".hero,.panel-card,.thresholds{border:1px solid rgba(152,199,235,.17);background:linear-gradient(145deg,rgba(24,50,73,.88),rgba(8,20,33,.94));border-radius:22px;box-shadow:0 14px 34px rgba(0,0,0,.22)}",
      ".hero{min-height:126px;padding:20px;display:flex;align-items:center;justify-content:space-between;gap:16px}",
      ".hero.compact{min-height:104px}",
      ".installation{position:relative;min-height:390px;aspect-ratio:.78;border-radius:22px;overflow:hidden;border:1px solid rgba(152,199,235,.17);background:#d9d8d3 url('/lider_voltage_control_panel/assets/lider-room-background-v1.webp?v=0.1.3') center center/cover no-repeat;box-shadow:0 14px 34px rgba(0,0,0,.22);isolation:isolate}",
      ".installation-equipment{position:absolute;z-index:1;left:62%;bottom:2.5%;height:90%;width:auto;max-width:70%;object-fit:contain;transform:translateX(-50%);filter:drop-shadow(0 12px 13px rgba(26,31,35,.24));pointer-events:none;user-select:none}",
      ".installation:after{content:'';position:absolute;z-index:2;inset:0;background:linear-gradient(180deg,transparent 64%,rgba(4,10,16,.72) 100%);pointer-events:none}",
      ".installation-caption{position:absolute;z-index:3;left:16px;right:16px;bottom:14px;display:flex;align-items:end;justify-content:space-between;gap:12px;text-shadow:0 2px 8px #000}",
      ".installation-caption span{font-size:12px;letter-spacing:.14em;font-weight:750}",
      ".installation-caption strong{font-size:15px}",
      ".eyebrow{font-size:11px;letter-spacing:.16em;color:#8fb9d8;font-weight:750}",
      "h1,h2,p{margin:0}",
      "h1{font-size:25px;margin-top:5px}",
      "h2{font-size:17px}",
      ".hero p,.line-card p,.line-focus p,.note{margin-top:7px;color:#9fb2c4;font-size:13px;line-height:1.4}",
      ".overall,.badge{padding:8px 11px;border-radius:999px;font-weight:750;font-size:12px;text-align:center;white-space:nowrap}",
      ".panel-card{padding:15px}",
      ".section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}",
      ".phase-grid,.detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}",
      ".metric{min-width:0;min-height:104px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1px solid rgba(255,255,255,.1);border-radius:17px;background:rgba(4,12,21,.55)}",
      ".metric.large{min-height:146px}",
      ".metric-label{color:#9fb2c4;font-size:12px}",
      ".metric strong{font-size:20px}",
      ".metric small{font-size:10px;line-height:1.2}",
      ".flow{text-align:center;color:#75a9cf;font-size:12px;letter-spacing:.08em;padding:1px}",
      ".line-card{display:grid;grid-template-columns:1fr 145px;align-items:center;gap:10px}",
      ".line-focus{display:grid;gap:13px;text-align:center}",
      ".thresholds{padding:16px}",
      ".thresholds p{margin-top:8px;color:#b8c7d5;font-size:13px;line-height:1.55}",
      ".note{text-align:center;padding:0 10px 18px}",
      ".normal{--tone:#46d38b;color:#8cf0b9;background:rgba(35,173,102,.12);border-color:rgba(70,211,139,.35)}",
      ".attention{--tone:#f6d34f;color:#ffe98a;background:rgba(246,211,79,.12);border-color:rgba(246,211,79,.35)}",
      ".significant{--tone:#ff9e45;color:#ffc184;background:rgba(255,137,42,.13);border-color:rgba(255,158,69,.4)}",
      ".emergency{--tone:#ff5d65;color:#ff9ba0;background:rgba(255,65,76,.14);border-color:rgba(255,93,101,.42)}",
      ".unavailable{--tone:#91a0ae;color:#bdc7d0;background:rgba(145,160,174,.1);border-color:rgba(145,160,174,.25)}",
      ".tabs{position:fixed;z-index:20;inset:auto 0 0 0;height:calc(70px + env(safe-area-inset-bottom));padding:4px 7px env(safe-area-inset-bottom);display:grid;grid-template-columns:repeat(4,1fr);background:rgba(5,13,22,.96);border-top:1px solid rgba(151,195,230,.17);backdrop-filter:blur(18px)}",
      ".tabs button{border:0;background:transparent;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#8395a6;min-height:58px}",
      ".tabs button span{font-size:22px;line-height:1}",
      ".tabs button small{font-size:10px}",
      ".tabs button.active{color:#7cc8ff;background:rgba(61,157,224,.12)}",
      ".zoom-toast{position:fixed;z-index:40;left:50%;top:calc(72px + env(safe-area-inset-top));transform:translate(-50%,-12px);opacity:0;padding:8px 13px;border-radius:999px;background:rgba(8,15,24,.9);font-size:12px;transition:.2s;pointer-events:none}",
      ".zoom-toast.show{opacity:1;transform:translate(-50%,0)}",
      "@media (max-width:420px){.canvas{padding:10px 10px 24px}.hero{padding:16px}.hero h1{font-size:22px}.installation-equipment{left:63%;height:91%;max-width:72%}.metric strong{font-size:18px}.line-card{grid-template-columns:1fr 128px}.badge,.overall{white-space:normal}}",
    ].join("");
  }
}

if (!customElements.get("lider-voltage-control-panel")) {
  customElements.define("lider-voltage-control-panel", LiderVoltageControlPanel);
}
