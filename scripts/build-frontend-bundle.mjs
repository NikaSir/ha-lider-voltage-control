import fs from "node:fs";

const sourcePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js";
const bundlePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const source = fs.readFileSync(sourcePath, "utf8");
if (/^\s*(?:import|export)\s/m.test(source)) throw new Error("Production source must be autonomous");

if (process.argv.includes("--check")) {
  if (!fs.existsSync(bundlePath) || fs.readFileSync(bundlePath, "utf8") !== source) {
    throw new Error(`Production entrypoint is stale: ${bundlePath}`);
  }
  console.log(`Current ${bundlePath}`);
} else {
  fs.writeFileSync(bundlePath, source);
  console.log(`Built ${bundlePath}`);
}
