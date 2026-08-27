import fs from "node:fs";

const sourcePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js";
const bundlePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const source = fs.readFileSync(sourcePath, "utf8").replace(/^\/\* GENERATED BUNDLE[^\n]*\*\/\n?/, "");
const banner = "/* GENERATED BUNDLE — run node scripts/build-frontend-bundle.mjs; do not edit directly. */\n";

if (/^\s*import\s/m.test(source)) {
  throw new Error("Production source must not contain runtime imports");
}

fs.writeFileSync(bundlePath, banner + source);
console.log(`Built ${bundlePath}`);
