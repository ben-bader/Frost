// Verifies that create-frost-app templates stay in sync with workspace
// package versions and never use workspace: ranges.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const workspaceVersions = {};
for (const dir of fs.readdirSync(path.join(root, "packages"))) {
  const pkgPath = path.join(root, "packages", dir, "package.json");
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  workspaceVersions[pkg.name] = pkg.version;
}

for (const template of ["template", "template-tailwind"]) {
  const pkgPath = path.join(root, "packages/create-frost-app", template, "package.json");
  if (!fs.existsSync(pkgPath)) {
    failures.push(`${template}/package.json missing`);
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  for (const [dep, range] of Object.entries(pkg.dependencies ?? {})) {
    if (range.startsWith("workspace:")) {
      failures.push(`${template}: ${dep} uses workspace range "${range}"`);
      continue;
    }
    if (dep.startsWith("@frost.js/") && workspaceVersions[dep]) {
      const expected = `^${workspaceVersions[dep]}`;
      if (range !== expected) {
        failures.push(`${template}: ${dep} is "${range}", expected "${expected}"`);
      }
    }
  }
}

if (failures.length) {
  console.error("check:template FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("check:template OK — template ranges match workspace versions");
