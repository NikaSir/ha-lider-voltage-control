import fs from "node:fs";
import vm from "node:vm";

const bundle = fs.readFileSync(
  "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js",
  "utf8",
);

class HTMLElement {
  attachShadow() {
    this.shadowRoot = {};
    return this.shadowRoot;
  }
}

const storage = new Map();
const context = {
  HTMLElement,
  customElements: { get: () => true, define: () => {} },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
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
    localStorage: { getItem: () => null, setItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  },
  document: { referrer: "" },
  URL,
  URLSearchParams,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  performance: { now: () => 1_000 },
  console,
};

vm.createContext(context);
vm.runInContext(bundle + "\nthis.Panel = LiderVoltageControlPanel;", context);

const panel = new context.Panel();
panel._connectionBadge = () => '<button class="overall">Связь</button>';
panel._scenePhase = (phase) => `<div class="scene-phase">${phase}</div>`;
panel._lineCard = () => '<section class="line-card">Линия</section>';

const overview = panel._overview();
const styles = panel._styles();

const headerStart = overview.indexOf('class="installation-header"');
const accent = overview.indexOf('class="installation-accent"');
const heading = overview.indexOf('class="scene-heading"');
const connection = overview.indexOf('class="overall"');
const sceneStart = overview.indexOf('class="installation-scene"');
const equipment = overview.indexOf('class="installation-equipment"');
const phase = overview.indexOf('class="scene-phase"');
const caption = overview.indexOf('class="installation-caption"');

if (!(headerStart >= 0 && accent > headerStart && heading > headerStart &&
      connection > headerStart && sceneStart > connection && equipment > sceneStart &&
      phase > sceneStart && caption > sceneStart)) {
  throw new Error(
    "overview must keep heading and connection in a separate accented header above the photo scene",
  );
}

const installationTag = overview.match(/<section class="installation"[^>]*>/)?.[0] ?? "";
const equipmentTag = overview.match(/<img class="installation-equipment"[^>]*>/)?.[0] ?? "";
if (/role="img"/.test(installationTag)) {
  throw new Error("interactive overview content must not be nested in an image role");
}
if (!/alt="Три стабилизатора LIDER PS-7500W-30/.test(equipmentTag) || /aria-hidden="true"/.test(equipmentTag)) {
  throw new Error("equipment image must expose its description without hiding phase controls");
}
if (!overview.includes("LIDER PS-7500W-30 · 3 шт.") || overview.includes("PS7500W-15")) {
  throw new Error("overview must identify the installed LIDER PS-7500W-30 model");
}

for (const rule of [
  ".installation-accent{position:absolute;z-index:0;right:-44px;top:-74px;width:205px;height:205px",
  ".overall{position:relative;z-index:2;width:168px;height:58px",
  ".installation-scene{position:relative;min-height:0;overflow:hidden;border-radius:18px",
  ".overview-page{height:100%;min-height:0;grid-template-rows:minmax(0,1fr) auto}",
  ".viewport[data-view=\"overview\"]:not(.zoomed){overflow-y:hidden}",
  ".installation-header{position:relative;min-width:0;overflow:hidden;padding:8px 6px 10px;display:grid;grid-template-columns:minmax(0,1fr) 168px",
  "@media (max-height:700px){.viewport[data-view=\"overview\"]:not(.zoomed){overflow-y:auto}.overview-page{height:auto}.overview-page .installation{min-height:600px}}",
]) {
  if (!styles.includes(rule)) {
    throw new Error(`overview header layout rule is missing: ${rule}`);
  }
}

const mobileSceneRule = styles.match(/@container nikas-panel \(max-width:560px\)\{([^]*?)\}(?=@container nikas-panel \(max-width:420px\)|$)/)?.[1] ?? "";

function computedClassStyle(cssText, classNames) {
  const classes = new Set(classNames);
  const result = new Map();
  let order = 0;
  for (const rule of cssText.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector of rule[1].split(",").map((value) => value.trim())) {
      if (!/^\.[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/i.test(selector)) continue;
      const required = [...selector.matchAll(/\.([a-z0-9_-]+)/gi)].map((match) => match[1]);
      if (!required.every((className) => classes.has(className))) continue;
      const specificity = required.length;
      for (const declaration of rule[2].split(";")) {
        const separator = declaration.indexOf(":");
        if (separator < 0) continue;
        const property = declaration.slice(0, separator).trim();
        const value = declaration.slice(separator + 1).trim();
        const previous = result.get(property);
        if (!previous || specificity > previous.specificity ||
            (specificity === previous.specificity && order >= previous.order)) {
          result.set(property, { value, specificity, order });
        }
      }
      order += 1;
    }
  }
  return Object.fromEntries([...result].map(([property, item]) => [property, item.value]));
}

const baseRules = styles.slice(0, styles.indexOf("@keyframes"));
const compactCss = baseRules + mobileSceneRule;
for (const classNames of [["canvas"], ["hero"], ["metric"], ["line-card"], ["raw-row"]]) {
  const baseStyle = computedClassStyle(baseRules, classNames);
  const phone430Style = computedClassStyle(baseRules + mobileSceneRule, classNames);
  if (JSON.stringify(baseStyle) !== JSON.stringify(phone430Style)) {
    throw new Error(`430px scene rules must not change .${classNames.join(".")} outside the photo scene`);
  }
}

for (const [phaseName, gridRow] of [["a", "2"], ["b", "3"], ["c", "4"]]) {
  const phaseStyle = computedClassStyle(compactCss, ["scene-phase", `phase-${phaseName}`, "side-input"]);
  if (phaseStyle.position !== "relative" || phaseStyle.top !== "auto" ||
      phaseStyle.transform !== "none" || phaseStyle["grid-row"] !== gridRow) {
    throw new Error(`mobile phase ${phaseName.toUpperCase()} must occupy its own unshifted grid row`);
  }
}

const metricLayout = computedClassStyle(compactCss, ["input-metrics"]);
if (metricLayout.gap !== "6px") {
  throw new Error("mobile power and voltage cards must have a 6px vertical gap");
}

const qualityLayout = computedClassStyle(compactCss, ["scene-quality"]);
if (qualityLayout["font-size"] !== "12px" || qualityLayout["white-space"] !== "normal") {
  throw new Error("stale quality must wrap below the value at readable size");
}

const telemetryPanel = new context.Panel();
telemetryPanel._reading = () => ({
  available: true,
  value: 214,
  quality: "stale",
  reportedAt: 1,
});
telemetryPanel._number = (value) => Number(value).toFixed(1).replace(".", ",");
telemetryPanel._inputTelemetryState = () => "ok";

const staleSceneReading = telemetryPanel._sceneReading("Напряжение", "sensor.test", "quality");
if (!staleSceneReading.includes("<b>214,0 В</b>") ||
    !staleSceneReading.includes('<small class="scene-quality">Данные устарели</small>') ||
    staleSceneReading.includes("· устарело")) {
  throw new Error("stale scene reading must keep the voltage on one line and show quality below it");
}

const staleMetric = telemetryPanel._metricCard("Напряжение", "sensor.test", "quality");
if (!staleMetric.includes("<strong>214,0 В</strong><small>Данные устарели</small>") ||
    staleMetric.includes("· устарело")) {
  throw new Error("metric card must not duplicate stale quality inside the voltage value");
}

telemetryPanel._displayState = () => ({
  state: "320",
  attributes: { unit_of_measurement: "W" },
  _nikasTelemetryQuality: "stale",
});
telemetryPanel._hass = { locale: { language: "ru" } };
const stalePower = telemetryPanel._scenePower("sensor.power");
if (!stalePower.includes('class="scene-power stale"') ||
    !stalePower.includes("<b>320 Вт</b>") ||
    !stalePower.includes('<small class="scene-quality">Данные устарели</small>') ||
    stalePower.includes("· устарело")) {
  throw new Error("stale power must keep its value compact and show quality below it");
}

console.log("Router-style LIDER overview header composition verified");
