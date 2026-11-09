#!/usr/bin/env node
// Syncs the shared CLI UI module into create-frost-app.
//
// packages/core/src/cli-ui.ts is the canonical source. It is transpiled
// (types stripped) to packages/create-frost-app/ui.mjs so the scaffolder
// stays dependency-free and runs through npx on any Node >= 20.
// TypeScript packages (cli, vite, generated server entries) import the
// same code via the "@frost.js/core/cli-ui" subpath export instead.
//
// Usage:
//   node scripts/sync-cli-ui.mjs          # write ui.mjs
//   node scripts/sync-cli-ui.mjs --check  # drift check (no writes)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "packages", "core", "src", "cli-ui.ts");
const OUT = path.join(root, "packages", "create-frost-app", "ui.mjs");
const check = process.argv.includes("--check");

// Transpile with the repo's own TypeScript (dev-only, never shipped).
const ts = spawnSync(
  process.execPath,
  [
    "-e",
    `const ts=require(${JSON.stringify(path.join(root, "node_modules", "typescript", "lib", "typescript.js"))});` +
      `const fs=require("fs");` +
      `const out=ts.transpileModule(fs.readFileSync(${JSON.stringify(SRC)},"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});` +
      `process.stdout.write(out.outputText);`,
  ],
  { encoding: "utf8", windowsHide: true },
);
if (ts.status !== 0) {
  console.error(`sync-cli-ui: transpile failed\n${ts.stderr}`);
  process.exit(1);
}
const content = ts.stdout.endsWith("\n") ? ts.stdout : ts.stdout + "\n";

if (check) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (existing !== content) {
    console.error(
      "sync-cli-ui --check FAILED: packages/create-frost-app/ui.mjs is stale.\n" +
        "Run: node scripts/sync-cli-ui.mjs",
    );
    process.exit(1);
  }
  console.log("sync-cli-ui OK — ui.mjs matches cli-ui.ts");
} else {
  fs.writeFileSync(OUT, content);
  console.log(`sync-cli-ui: wrote ${path.relative(root, OUT)}`);
}
