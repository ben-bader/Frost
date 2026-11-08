// Dry-run release verification: pack dry-run, publint, attw, e2e.
// Never publishes and never writes to the registry.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  ["pack --dry-run (all packages)", "pnpm", ["-r", "pack", "--dry-run"]],
  ["publint (all packages)", "npx", ["publint", "packages/*"]],
];
for (const dir of ["core", "router", "data", "react", "server", "adapter-node", "vite", "test", "cli"]) {
  steps.push([`attw ${dir}`, "npx", ["@arethetypeswrong/cli", "--pack", `packages/${dir}`]]);
}
steps.push(["e2e-pack", process.execPath, ["scripts/e2e-pack.mjs", "--skip-build"]]);

let failed = 0;
for (const [label, cmd, args] of steps) {
  console.log(`\n===== release:check — ${label} =====`);
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32" && /^(pnpm|npm|npx)(\.cmd)?$/.test(cmd),
    windowsHide: true,
  });
  if (res.status !== 0) {
    failed++;
    console.error(`FAILED: ${label}`);
  }
}
process.exit(failed ? 1 : 0);
