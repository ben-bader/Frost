// Build + pack every publishable package into ./release-tarballs,
// in dependency order (leaf first, create-frost-app last).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "release-tarballs");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const PACKAGES = [
  ["@frost.js/core", "core"],
  ["@frost.js/router", "router"],
  ["@frost.js/data", "data"],
  ["@frost.js/react", "react"],
  ["@frost.js/server", "server"],
  ["@frost.js/adapter-node", "adapter-node"],
  ["@frost.js/vite", "vite"],
  ["@frost.js/test", "test"],
  ["@frost.js/cli", "cli"],
  ["create-frost-app", "create-frost-app"],
];

const run = (cmd, args, cwd) => {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32" && /^(pnpm|npm)(\.cmd)?$/.test(cmd),
    windowsHide: true,
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

console.log("Building all packages...");
run("pnpm", ["-r", "run", "build"], root);

console.log("Packing into release-tarballs/ ...");
for (const [name, dir] of PACKAGES) {
  const dest = path.join(outDir, dir);
  fs.mkdirSync(dest, { recursive: true });
  console.log(`  ${name}`);
  run("pnpm", ["pack", "--pack-destination", dest], path.join(root, "packages", dir));
}
console.log("\nDone. Tarballs are in release-tarballs/<package>/");
