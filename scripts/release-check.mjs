// release:check — dry-run release verification. NEVER publishes and
// never writes to the npm registry.
//
// Every step is a Node script or a direct binary invocation through
// scripts/lib/run.mjs (no shell globs, no bash-only syntax), so this
// works identically on Windows and Linux.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./lib/run.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

const steps = [
  ["pack --dry-run", "pnpm", ["-r", "pack", "--dry-run"]],
  ["lint-packages (publint + attw)", node, ["scripts/lint-packages.mjs"]],
  ["check:template", node, ["scripts/check-template.mjs"]],
  ["docs:check", node, ["scripts/check-docs.mjs"]],
  ["docs:check-assets", node, ["scripts/check-assets.mjs"]],
  ["e2e-pack", node, ["scripts/e2e-pack.mjs", "--skip-build"]],
];

const results = [];
for (const [label, cmd, args] of steps) {
  console.log(`\n===== release:check — ${label} =====`);
  const res = run(cmd, args, { cwd: root });
  const ok = res.status === 0;
  results.push({ label, ok });
  if (!ok) {
    const out = `${res.stderr ?? ""}\n${res.stdout ?? ""}`;
    console.error(out.slice(-3000));
  }
}

console.log("\n===== release:check RESULTS =====");
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}`);
}
console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} STEP(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
