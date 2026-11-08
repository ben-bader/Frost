#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { scaffold, TEMPLATES, type TemplateName } from "./scaffold.js";

function usage(): never {
  console.log(`create-frost — scaffold a new Frost application

Usage: npm create frost@latest [directory] [options]

Options:
  --template <name>   Template to use: ${TEMPLATES.join(" | ")} (default: minimal)
  --name <name>       Package name for the new app
  --pm <pm>           Package manager: pnpm | npm | yarn | bun (default: pnpm)
  --no-install        Skip dependency installation
  --no-git            Skip git init
  -h, --help          Show this help`);
  process.exit(0);
}

const args = process.argv.slice(2);
let target = "";
let template: TemplateName = "minimal";
let name = "";
let pm = "pnpm";
let install = true;
let git = true;

const next = (i: number): string => {
  const v = args[i + 1];
  if (v === undefined) {
    console.error(`Missing value for ${args[i]}`);
    process.exit(1);
  }
  return v;
};

for (let i = 0; i < args.length; i++) {
  const a = args[i]!;
  if (a === "-h" || a === "--help") usage();
  else if (a === "--template") { template = next(i) as TemplateName; i++; }
  else if (a === "--name") { name = next(i); i++; }
  else if (a === "--pm") { pm = next(i); i++; }
  else if (a === "--no-install") install = false;
  else if (a === "--no-git") git = false;
  else if (a.startsWith("-")) {
    console.error(`Unknown option: ${a}`);
    process.exit(1);
  } else if (!target) target = a;
}

if (!target) {
  console.error("Missing target directory. Usage: npm create frost@latest <dir>");
  process.exit(1);
}
if (!["pnpm", "npm", "yarn", "bun"].includes(pm)) {
  console.error(`Unknown package manager: ${pm}`);
  process.exit(1);
}
if (!TEMPLATES.includes(template)) {
  console.error(`Unknown template: ${template}. Available: ${TEMPLATES.join(", ")}`);
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), target);
const result = scaffold({
  targetDir,
  template,
  ...(name || !path.basename(targetDir).match(/^[a-z0-9][a-z0-9-]*$/)
    ? { appName: name || path.basename(targetDir).replace(/[^a-z0-9-]/g, "-") }
    : {}),
});

console.log(`Created ${result.template} Frost app in ${result.targetDir}`);
console.log(`  ${result.files.length} files written`);

const run = (cmd: string, cmdArgs: string[], cwd: string): boolean => {
  const isWin = process.platform === "win32";
  const res = spawnSync(isWin ? `${cmd}.cmd` : cmd, cmdArgs, {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });
  return res.status === 0;
};

if (git) {
  if (!run("git", ["init"], targetDir)) {
    console.warn("  git init failed (is git installed?) — continuing anyway.");
  }
}
if (install) {
  const installArgs = pm === "npm" ? ["install"] : ["install"];
  console.log(`\nInstalling dependencies with ${pm}...`);
  if (!run(pm, installArgs, targetDir)) {
    console.warn(`  ${pm} install failed — run it manually in ${targetDir}`);
  }
}

console.log(`
Done! Next steps:

  cd ${target}
  ${pm} dev        # start the dev server
  ${pm} build      # production build
  ${pm} start      # serve the production build
`);
