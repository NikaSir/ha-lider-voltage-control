import fs from "node:fs";

const shellPath = "templates/shell_v2/nikas-specialized-shell.js";
const sourcePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js";
const bundlePath = "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js";
const shell = fs.readFileSync(shellPath, "utf8");
const source = fs.readFileSync(sourcePath, "utf8").replace(/^\/\* GENERATED BUNDLE[^\n]*\*\/\n?/, "");
const banner = "/* GENERATED BUNDLE — run node scripts/build-frontend-bundle.mjs; do not edit directly. */\n";
const output = banner +
  `// BEGIN ${shellPath}\n${shell.trimEnd()}\n// END ${shellPath}\n` +
  `// BEGIN ${sourcePath}\n${source.trimEnd()}\n// END ${sourcePath}\n`;

if (/^\s*import\s/m.test(shell + "\n" + source)) {
  throw new Error("Production source must not contain runtime imports");
}

if (process.argv.includes("--check")) {
  if (!fs.existsSync(bundlePath) || fs.readFileSync(bundlePath, "utf8") !== output) {
    throw new Error(`Generated bundle is stale: ${bundlePath}`);
  }
  console.log(`Current ${bundlePath}`);
} else {
  fs.writeFileSync(bundlePath, output);
  console.log(`Built ${bundlePath}`);
}
