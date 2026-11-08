#!/usr/bin/env node
// create-frost-app — scaffold a new Frost application.
// Usage: npm create frost-app@latest [name] [--template minimal|tailwind]
//        [--install] [--no-git] [--pm pnpm|npm|yarn|bun]
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = "0.1.0";
const TEMPLATES = ["minimal", "tailwind"];

function fail(message) {
  console.error(`\n  Error: ${message}\n`);
  process.exit(1);
}

function usage() {
  console.log(`create-frost-app — scaffold a new Frost application

Usage: npm create frost-app@latest [name] [options]

Arguments:
  name                  Project directory/name (default: my-frost-app)

Options:
  --template <name>     Template: ${TEMPLATES.join(" | ")} (default: minimal)
  --pm <pm>             Package manager: pnpm | npm | yarn | bun
                        (default: detected from npm_config_user_agent)
  --install             Run the package manager install (default: yes)
  --no-install          Skip dependency installation
  --no-git              Skip git init
  --help                Show this help
  --version             Show version`);
}

function isValidName(name) {
  if (!name || name === "." || name === "..") return false;
  if (path.isAbsolute(name)) return false;
  if (/[\/:*?"<>|]/.test(name)) return false;
  if (name.includes("..")) return false;
  // npm package-name safe: lowercase alnum, -, _, . ; also allow scoped-ish input rejection
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name);
}

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent || "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

function prompt(question, fallback) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} (${fallback}): `, (answer) => {
      rl.close();
      const value = answer.trim();
      resolve(value || fallback);
    });
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function run(cmd, args, cwd) {
  const isWin = process.platform === "win32";
  const res = spawnSync(isWin ? `${cmd}.cmd` : cmd, args, {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });
  return res.status === 0;
}

function commandExists(cmd) {
  const isWin = process.platform === "win32";
  const res = spawnSync(isWin ? "where" : "which", [cmd], {
    stdio: "ignore",
    windowsHide: true,
  });
  return res.status === 0;
}

function insideGitRepo(dir) {
  const res = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: dir,
    stdio: "ignore",
    windowsHide: true,
  });
  return res.status === 0;
}

/** Replace __APP_NAME__ in every text file under dir. */
function replacePlaceholder(dir, appName) {
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const buf = fs.readFileSync(full);
      if (buf.includes(0)) continue; // skip binaries
      const text = buf.toString("utf8");
      if (text.includes("__APP_NAME__")) {
        fs.writeFileSync(full, text.split("__APP_NAME__").join(appName));
      }
    }
  };
  walk(dir);
}

async function main() {
  const args = process.argv.slice(2);
  let name = "";
  let template = "minimal";
  let pm = "";
  let install = true;
  let git = true;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => {
      const v = args[++i];
      if (v === undefined) fail(`Missing value for ${a}`);
      return v;
    };
    if (a === "--help" || a === "-h") {
      usage();
      process.exit(0);
    } else if (a === "--version" || a === "-v") {
      console.log(VERSION);
      process.exit(0);
    } else if (a === "--template") {
      template = next();
    } else if (a === "--pm") {
      pm = next();
    } else if (a === "--install") {
      install = true;
    } else if (a === "--no-install") {
      install = false;
    } else if (a === "--no-git") {
      git = false;
    } else if (a.startsWith("-")) {
      fail(`Unknown option: ${a} (try --help)`);
    } else if (!name) {
      name = a;
    } else {
      fail(`Unexpected argument: ${a}`);
    }
  }

  if (!TEMPLATES.includes(template)) {
    fail(`Unknown template "${template}". Available: ${TEMPLATES.join(", ")}`);
  }

  if (!name) {
    name = await prompt("Project name", "my-frost-app");
  }
  if (!isValidName(name)) {
    fail(
      `Invalid project name "${name}". Use letters, numbers, '.', '_' and '-' ` +
        `(e.g. my-app). No path separators, '.'/'..' or absolute paths.`,
    );
  }

  pm = pm || detectPackageManager();
  if (!["pnpm", "npm", "yarn", "bun"].includes(pm)) {
    fail(`Unknown package manager "${pm}". Use pnpm, npm, yarn, or bun.`);
  }

  const targetDir = path.resolve(process.cwd(), name);
  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0) {
      fail(`Target directory ${targetDir} exists and is not empty.`);
    }
  }

  const templateDir = template === "tailwind" ? "template-tailwind" : "template";
  const src = path.join(__dirname, templateDir);
  if (!fs.existsSync(src)) {
    fail(`Template "${template}" not found in this installation.`);
  }

  copyDir(src, targetDir);

  // npm strips dotfiles from tarballs — templates ship them underscored.
  for (const [from, to] of [
    ["_gitignore", ".gitignore"],
    ["_npmrc", ".npmrc"],
  ]) {
    const f = path.join(targetDir, from);
    if (fs.existsSync(f)) fs.renameSync(f, path.join(targetDir, to));
  }

  // Set the package name and replace placeholders everywhere.
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  replacePlaceholder(targetDir, name);

  console.log(`\n  Created a Frost ${template} app in ./${name}`);

  const parent = path.dirname(targetDir);
  if (git && commandExists("git") && !insideGitRepo(parent)) {
    if (run("git", ["init"], targetDir)) {
      console.log("  Initialized git repository");
    } else {
      console.log("  (git init skipped — continuing anyway)");
    }
  }

  if (install) {
    console.log(`\n  Installing dependencies with ${pm}...`);
    if (!run(pm, ["install"], targetDir)) {
      console.log(`  ${pm} install failed — run it manually in ./${name}`);
    }
  }

  console.log(`
  Done! Next steps:

    cd ${name}
    ${pm} install${install ? "   # already done" : ""}
    ${pm} run dev      # start the dev server (http://localhost:3000)
    ${pm} run build    # production build
    ${pm} start        # serve the production build
`);
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
