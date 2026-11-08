// Lint every publishable package: publint + arethetypeswrong (attw).
// Reads workspace package dirs from pnpm-workspace.yaml — no shell globs.
// Prints PASS/FAIL per package per tool; exit 1 if anything fails.
//
// attw runs with --profile esm-only because all packages are intentionally
// pure ESM (Node >= 20); the "node16 from CJS" resolution note is expected
// and must not fail the check. create-frost-app is skipped for attw —
// it is bin-only with no importable entry point.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./lib/run.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// All workspace packages under packages/ that ship to npm.
const pkgDirs = fs
  .readdirSync(path.join(root, "packages"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(root, "packages", d.name))
  .filter((dir) => fs.existsSync(path.join(dir, "package.json")))
  .sort();

const results = [];
function record(tool, pkg, ok, detail = "") {
  results.push({ tool, pkg, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${tool.padEnd(7)} ${pkg}${detail ? ` — ${detail}` : ""}`);
}

console.log(`== publint (${pkgDirs.length} packages) ==`);
for (const dir of pkgDirs) {
  const name = path.basename(dir);
  const res = run("npx", ["publint", dir], { cwd: root });
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const ok = res.status === 0 && /All good/.test(out);
  record("publint", name, ok, ok ? "" : out.trim().split("\n").slice(-3).join(" | "));
}

console.log(`\n== attw --profile esm-only (${pkgDirs.length - 1} packages) ==`);
for (const dir of pkgDirs) {
  const name = path.basename(dir);
  if (name === "create-frost-app") continue;
  const res = run("npx", ["@arethetypeswrong/cli", "--pack", "--profile", "esm-only", dir], {
    cwd: root,
  });
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  // attw exits non-zero on errors; warnings are fine under esm-only.
  const ok = res.status === 0;
  const failLines = out
    .split("\n")
    .filter((l) => l.includes("💀") || l.includes("failed"))
    .slice(0, 3)
    .join(" | ");
  record("attw", name, ok, ok ? "" : failLines || out.trim().split("\n").slice(-3).join(" | "));
}

console.log("\n===== lint-packages RESULTS =====");
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.tool.padEnd(7)} ${r.pkg}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
