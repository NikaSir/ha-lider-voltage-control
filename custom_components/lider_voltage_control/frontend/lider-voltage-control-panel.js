import "./lider-voltage-control-panel-core.js?v=0.4.4";

const UI_VERSION = "0.5.0";
const RETURN_ROUTE_KEY = "nikas.lider.return_route.v1";
const SOURCE_ROUTE_KEY = "nikas.specialized.source_route.v1";
const SAFE_DEFAULT_ROUTE = "/dashboard-infrastructure/overview";
const SAFE_ROUTE_PREFIXES = [
  "/dashboard-house",
  "/dashboard-actions",
  "/dashboard-infrastructure",
];
const ROUTE_TOKENS = Object.freeze({
  house: "/dashboard-house",
  home: "/dashboard-house",
  actions: "/dashboard-actions",
  infrastructure: SAFE_DEFAULT_ROUTE,
});

const Panel = customElements.get("lider-voltage-control-panel");

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
    // Keep the original candidate when it is not URI encoded.
  }
  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (!SAFE_ROUTE_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix + "/"))) {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch (_err) {
    return null;
  }
}

function resolveReturnRoute(panel) {
  const current = new URL(window.location.href);
  const explicit = safeReturnRoute(current.searchParams.get("return_to") || current.searchParams.get("from"));
  let handedOff = null;
  try {
    handedOff = safeReturnRoute(sessionStorage.getItem(SOURCE_ROUTE_KEY));
    sessionStorage.removeItem(SOURCE_ROUTE_KEY);
  } catch (_err) {
    handedOff = null;
  }
  let referrer = null;
  try {
    referrer = safeReturnRoute(document.referrer);
  } catch (_err) {
    referrer = null;
  }
  const configured = safeReturnRoute(panel?.panel?.config?.parent_route || panel?._panel?.config?.parent_route);
  const route = explicit || handedOff || referrer || configured || SAFE_DEFAULT_ROUTE;
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

function entitySort(panel, left, right) {
  const leftName = panel._hass?.states?.[left]?.attributes?.friendly_name || left;
  const rightName = panel._hass?.states?.[right]?.attributes?.friendly_name || right;
  return String(leftName).localeCompare(String(rightName), panel._hass?.locale?.language || "ru");
}

function diagnosticsGroups(panel) {
  const knownBefore = [
    ...Object.values({
      A: "sensor.power_monitor_voltage_a",
      B: "sensor.power_monitor_voltage_b",
      C: "sensor.power_monitor_voltage_c",
    }),
    ...Object.values({
      A: "sensor.power_monitor_current_a",
      B: "sensor.power_monitor_current_b",
      C: "sensor.power_monitor_current_c",
    }),
    ...Object.values({
      A: "sensor.power_monitor_power_a",
      B: "sensor.power_monitor_power_b",
      C: "sensor.power_monitor_power_c",
    }),
    "binary_sensor.power_meter_online",
    "binary_sensor.power_phase_loss",
  ];
  const afterVoltage = {
    A: "sensor.socket_zb_2_voltage",
    B: "sensor.socket_zb_3_voltage",
    C: "sensor.socket_zb_31_voltage",
  };
  const groups = [
    {
      title: "Входной измеритель",
      subtitle: "Все состояния и атрибуты сущностей, формирующих контроль до LIDER.",
      ids: [...knownBefore, ...(panel._diagnosticEntities?.before || [])],
    },
    ...["A", "B", "C"].map((phase) => ({
      title: `После LIDER · фаза ${phase}`,
      subtitle: "Полный raw-набор контрольной розетки этой фазы.",
      ids: [
        afterVoltage[phase],
        panel._relatedAfterEntity?.(phase, "current"),
        panel._relatedAfterEntity?.(phase, "power"),
        ...(panel._diagnosticEntities?.after?.[phase] || []),
      ],
    })),
    {
      title: "Неотключаемая линия · UPS Котёл",
      subtitle: "Все диагностические сущности устройства Stark SolarPower, используемого как источник линии.",
      ids: [panel._lineEntity?.(), ...(panel._diagnosticEntities?.line || [])],
    },
  ];

  return groups.map((group) => ({
    ...group,
    ids: [...new Set(group.ids.filter((entityId) => entityId && panel._hass?.states?.[entityId]))]
      .sort((left, right) => entitySort(panel, left, right)),
  }));
}

function diagnosticValue(value) {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return String(value);
  }
}

function diagnosticRow(label, value, className = "") {
  return `<div class="raw-row${className ? ` ${className}` : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(diagnosticValue(value))}</strong></div>`;
}

function diagnosticEntity(panel, entityId) {
  const state = panel._hass?.states?.[entityId];
  if (!state) return "";
  const attrs = state.attributes || {};
  const name = attrs.friendly_name || entityId;
  const attrRows = Object.keys(attrs)
    .sort((a, b) => a.localeCompare(b, panel._hass?.locale?.language || "ru"))
    .map((key) => diagnosticRow(key, attrs[key]))
    .join("");
  const context = state.context || {};
  const contextRows = [
    ["context.id", context.id],
    ["context.parent_id", context.parent_id],
    ["context.user_id", context.user_id],
  ].filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => diagnosticRow(key, value))
    .join("");

  return `<article class="raw-entity" data-entity="${escapeHtml(entityId)}" role="button" tabindex="0" aria-label="${escapeHtml(name)}">`
    + `<div class="raw-entity-head"><div><h3>${escapeHtml(name)}</h3><code>${escapeHtml(entityId)}</code></div><ha-icon icon="mdi:chevron-right"></ha-icon></div>`
    + `<div class="raw-list">`
    + diagnosticRow("state", state.state, "raw-state")
    + diagnosticRow("last_changed", state.last_changed)
    + diagnosticRow("last_updated", state.last_updated)
    + diagnosticRow("last_reported", state.last_reported)
    + contextRows
    + attrRows
    + `</div></article>`;
}

function diagnosticsView(panel) {
  const groups = diagnosticsGroups(panel);
  const total = groups.reduce((sum, group) => sum + group.ids.length, 0);
  return `<div class="page diagnostics-page">`
    + `<section class="hero compact diagnostics-hero"><div class="hero-title"><span class="eyebrow">ТЕХНИЧЕСКИЙ ЭКРАН</span><h1>Диагностика</h1><p>Raw-состояния и все атрибуты задействованных сущностей Home Assistant.</p></div><span class="badge neutral">${total} сущн.</span></section>`
    + groups.map((group) => `<section class="panel-card raw-group"><div class="section-head raw-group-head"><div><h2>${escapeHtml(group.title)}</h2><p>${escapeHtml(group.subtitle)}</p></div><span class="raw-count">${group.ids.length}</span></div>`
      + (group.ids.length
        ? `<div class="raw-entities">${group.ids.map((entityId) => diagnosticEntity(panel, entityId)).join("")}</div>`
        : `<p class="raw-empty">Сущности пока не найдены.</p>`)
      + `</section>`).join("")
    + `<p class="note">Экран не фильтрует сервисные, энергетические или raw-атрибуты. Нажатие на сущность открывает More Info Home Assistant.</p>`
    + `</div>`;
}

function sameNodeKind(current, desired) {
  return Boolean(current && desired && current.nodeType === desired.nodeType
    && (current.nodeType !== Node.ELEMENT_NODE || current.tagName === desired.tagName));
}

function syncAttributes(current, desired) {
  for (const attribute of Array.from(current.attributes || [])) {
    if (!desired.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for (const attribute of Array.from(desired.attributes || [])) {
    if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
}

function reconcileTree(current, desired) {
  if (!sameNodeKind(current, desired)) return false;
  if (current.nodeType === Node.TEXT_NODE) {
    if (current.nodeValue !== desired.nodeValue) current.nodeValue = desired.nodeValue;
    return true;
  }
  if (current.nodeType === Node.ELEMENT_NODE) syncAttributes(current, desired);
  let index = 0;
  while (index < desired.childNodes.length) {
    const wanted = desired.childNodes[index];
    const existing = current.childNodes[index];
    if (!existing) current.appendChild(wanted.cloneNode(true));
    else if (!sameNodeKind(existing, wanted)) existing.replaceWith(wanted.cloneNode(true));
    else reconcileTree(existing, wanted);
    index += 1;
  }
  while (current.childNodes.length > desired.childNodes.length) current.lastChild.remove();
  return true;
}

function installPatch() {
  if (!Panel || Panel.prototype.__nikasUi050Patched) return;
  const proto = Panel.prototype;
  proto.__nikasUi050Patched = true;

  const baseMount = proto._mount;
  const baseViewHtml = proto._viewHtml;
  const baseUpdateLiveDom = proto._updateLiveDom;
  const baseStyles = proto._styles;

  proto._viewHtml = function patchedViewHtml() {
    if (this._view === "diagnostics") return diagnosticsView(this);
    return baseViewHtml.call(this);
  };

  proto._updateLiveDom = function patchedUpdateLiveDom() {
    if (this._view !== "diagnostics") {
      baseUpdateLiveDom.call(this);
      return;
    }
    if (!this._canvas || this._renderedView !== this._view) return;
    const template = document.createElement("template");
    template.innerHTML = diagnosticsView(this);
    const current = this._canvas.firstElementChild;
    const desired = template.content.firstElementChild;
    if (current && desired && sameNodeKind(current, desired)) reconcileTree(current, desired);
    else if (desired) this._canvas.replaceChildren(desired);
  };

  proto._styles = function patchedStyles() {
    return baseStyles.call(this).concat([
      ".title-return{justify-self:center;min-width:min(290px,100%);max-width:100%;min-height:44px;padding:5px 14px;border:1px solid color-mix(in srgb,var(--primary-color,#03a9d9) 24%,var(--divider-color,#dfe3e8));border-radius:16px;background:color-mix(in srgb,var(--primary-color,#03a9d9) 5%,var(--card-background-color,#fff));box-shadow:0 5px 16px rgba(23,45,76,.06);cursor:pointer}",
      ".title-return:active{background:color-mix(in srgb,var(--primary-color,#03a9d9) 13%,var(--card-background-color,#fff));border-color:color-mix(in srgb,var(--primary-color,#03a9d9) 42%,var(--divider-color,#dfe3e8));box-shadow:0 2px 7px rgba(23,45,76,.05)}",
      ".tabs{grid-template-columns:repeat(6,minmax(0,1fr))}",
      ".tabs button small{font-size:10px;line-height:1.05}",
      ".diagnostics-page{padding-bottom:6px}",
      ".diagnostics-hero .hero-title{min-width:0}.diagnostics-hero p{margin-top:4px;font-size:13px;color:var(--secondary-text-color,#68737d)}",
      ".raw-group{padding:12px;display:grid;gap:9px}",
      ".raw-group-head{align-items:flex-start}.raw-group-head>div{min-width:0}.raw-group-head p{margin:3px 0 0;font-size:13px;line-height:1.35;color:var(--secondary-text-color,#68737d)}",
      ".raw-count{min-width:28px;height:28px;padding:0 7px;border:1px solid var(--divider-color,#dfe3e8);border-radius:999px;display:grid;place-items:center;font-size:12px;font-weight:750;color:var(--secondary-text-color,#68737d)}",
      ".raw-entities{display:grid;gap:8px}",
      ".raw-entity{min-width:0;border:1px solid var(--divider-color,#dfe3e8);border-radius:16px;background:color-mix(in srgb,var(--secondary-text-color,#68737d) 3%,var(--card-background-color,#fff));padding:10px;display:grid;gap:8px;cursor:pointer;outline:none}",
      ".raw-entity:focus-visible{border-color:var(--primary-color,#03a9d9);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color,#03a9d9) 18%,transparent)}",
      ".raw-entity-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.raw-entity-head>div{min-width:0}.raw-entity-head h3{margin:0;font-size:15px;line-height:1.25}.raw-entity-head code{display:block;margin-top:3px;font-size:11px;color:var(--secondary-text-color,#68737d);white-space:normal;overflow-wrap:anywhere}.raw-entity-head ha-icon{flex:0 0 auto;--mdc-icon-size:20px;color:var(--secondary-text-color,#68737d)}",
      ".raw-list{display:grid;border-top:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 75%,transparent)}",
      ".raw-row{min-width:0;display:grid;grid-template-columns:minmax(108px,.8fr) minmax(0,1.4fr);gap:10px;padding:7px 2px;border-bottom:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 55%,transparent)}",
      ".raw-row span{font-size:12px;color:var(--secondary-text-color,#68737d);overflow-wrap:anywhere}.raw-row strong{min-width:0;font-size:13px;font-weight:650;text-align:right;overflow-wrap:anywhere;word-break:break-word}.raw-state strong{font-size:15px;color:var(--primary-text-color,#17191c)}",
      ".raw-empty{margin:0;padding:8px 2px;font-size:13px;color:var(--secondary-text-color,#68737d)}",
      "@media(max-width:430px){.title-return{min-width:0;width:100%;padding-inline:8px}.title-return strong{font-size:21px}.title-return small{font-size:13px}.tabs button small{font-size:9px}.raw-row{grid-template-columns:minmax(96px,.75fr) minmax(0,1.25fr)}}",
    ]);
  };

  proto._mount = function patchedMount() {
    if (this._mounted) return;
    this._returnRoute = resolveReturnRoute(this);
    baseMount.call(this);

    const currentTitle = this.shadowRoot.querySelector(".title");
    if (currentTitle && !currentTitle.classList.contains("title-return")) {
      const titleButton = document.createElement("button");
      titleButton.type = "button";
      titleButton.className = "title title-return";
      titleButton.setAttribute("aria-label", "LIDER — вернуться в базовую панель NikaS");
      titleButton.innerHTML = `<strong>LIDER</strong><small>UI v${UI_VERSION}</small>`;
      currentTitle.replaceWith(titleButton);
      titleButton.addEventListener("click", () => navigateHome(this));
    }

    const tabs = this.shadowRoot.querySelector(".tabs");
    if (tabs && !tabs.querySelector('[data-view="diagnostics"]')) {
      const template = document.createElement("template");
      template.innerHTML = this._tabButton("diagnostics", "mdi:stethoscope", "Диагностика");
      const button = template.content.firstElementChild;
      button.classList.toggle("active", this._view === "diagnostics");
      tabs.appendChild(button);
    }

    this._canvas?.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      const target = event.target.closest?.('.raw-entity[data-entity]');
      if (!target) return;
      event.preventDefault();
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId: target.dataset.entity },
      }));
    });
  };
}

installPatch();
