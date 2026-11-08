// Build + pack every publishable package into ./release-tarballs,
// in dependency order (leaf first, create-frost-app last).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./lib/run.mjs";

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

// run from ./lib/run.mjs — cmd.exe /c shim on Windows, no
// shell:true + args (avoids DEP0190). stdio inherit like before.
const runStep = (cmd, args, cwd) => {
  const res = run(cmd, args, { cwd, stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

console.log("Building all packages...");
runStep("pnpm", ["-r", "run", "build"], root);

// Regenerate the starter template so tarballs always ship a fresh copy
// (create-frost-app's prepack also does this; explicit here for clarity).
console.log("Syncing create-frost-app template from examples/starter...");
runStep("node", ["scripts/sync-template.mjs"], root);

console.log("Packing into release-tarballs/ ...");
for (const [name, dir] of PACKAGES) {
  const dest = path.join(outDir, dir).split(path.sep).join("/");
  fs.mkdirSync(dest, { recursive: true });
  console.log(`  ${name}`);
  runStep("pnpm", ["pack", "--pack-destination", dest], path.join(root, "packages", dir));
}
console.log("\nDone. Tarballs are in release-tarballs/<package>/");
