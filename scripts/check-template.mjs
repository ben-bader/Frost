// Drift guard for create-frost-app templates.
// 1. Regenerates template/ from examples/starter twice and requires the
//    outputs to be identical (determinism) and, when template/ exists in
//    the working tree, to match it (drift).
// 2. Verifies template-minimal/package.json @frost.js/* ranges match the
//    current workspace package versions.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const res = spawnSync(process.execPath, [path.join(root, "scripts", "sync-template.mjs"), "--check"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
});
if (res.status !== 0) {
  failures.push(`sync-template --check failed:\n${(res.stderr || res.stdout || "").trim()}`);
}

// 3. packages/create-frost-app/ui.mjs must match the transpiled
//    packages/core/src/cli-ui.ts canonical source.
const uiRes = spawnSync(process.execPath, [path.join(root, "scripts", "sync-cli-ui.mjs"), "--check"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
});
if (uiRes.status !== 0) {
  failures.push(`sync-cli-ui --check failed:\n${(uiRes.stderr || uiRes.stdout || "").trim()}`);
}

// workspace versions
const workspaceVersions = {};
for (const dir of fs.readdirSync(path.join(root, "packages"))) {
  const pkgPath = path.join(root, "packages", dir, "package.json");
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  workspaceVersions[pkg.name] = pkg.version;
}

// template-minimal ranges must match workspace versions
const minimalPkgPath = path.join(root, "packages/create-frost-app/template-minimal/package.json");
const minimal = JSON.parse(fs.readFileSync(minimalPkgPath, "utf8"));
for (const [dep, range] of Object.entries({ ...minimal.dependencies, ...minimal.devDependencies })) {
  if (range.startsWith("workspace:")) {
    failures.push(`template-minimal: ${dep} uses workspace range "${range}"`);
  } else if (dep.startsWith("@frost.js/") && workspaceVersions[dep]) {
    const expected = `^${workspaceVersions[dep]}`;
    if (range !== expected) {
      failures.push(`template-minimal: ${dep} is "${range}", expected "${expected}"`);
    }
  }
}

if (failures.length) {
  console.error("check:template FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("check:template OK");
