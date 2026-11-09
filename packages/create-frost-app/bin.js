#!/usr/bin/env node
// create-frost-app — scaffold a new Frost application.
// Usage: npm create frost-app@latest [name] [--template starter|minimal]
//        [--install] [--no-git] [--pm pnpm|npm|yarn|bun]
//        [--no-color] [--no-emoji] [--ascii]
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  brandHeader,
  configureUi,
  detectUiConfig,
  dim,
  emoji,
  mint,
  padEnd,
  railBlank,
  railDone,
  railField,
  railTitle,
  red,
  roundedBox,
  startSpinner,
  sym,
  white,
} from "./ui.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = ["starter", "minimal"];
const VERSION = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
).version;

configureUi(detectUiConfig());

const PM_RUN = {
  npm: { dev: "npm run dev", build: "npm run build", start: "npm start", install: "npm install" },
  pnpm: { dev: "pnpm dev", build: "pnpm build", start: "pnpm start", install: "pnpm install" },
  yarn: { dev: "yarn dev", build: "yarn build", start: "yarn start", install: "yarn install" },
  bun: { dev: "bun run dev", build: "bun run build", start: "bun run start", install: "bun install" },
};

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
  --template <name>     Template: ${TEMPLATES.join(" | ")} (default: starter)
  --pm <pm>             Package manager: pnpm | npm | yarn | bun
                        (default: detected from npm_config_user_agent)
  --install             Run the package manager install (default: yes)
  --no-install          Skip dependency installation
  --no-git              Skip git init
  --no-color            Disable ANSI colors
  --no-emoji            Disable emoji
  --ascii               Use ASCII symbols instead of Unicode
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

/** Rail-styled prompt: "◆  Project name" with dim default. */
async function promptField(label, fallback) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const promptText =
    mint(sym("prompt")) + "  " + dim(label) + "  " + dim(`(${fallback})`) + " ";
  const answer = await new Promise((resolve) => {
    rl.question(promptText, resolve);
  });
  rl.close();
  return answer.trim() || fallback;
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

function quoteArg(arg) {
  const s = String(arg);
  return /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

/**
 * Spawn cmd with its args. On Windows, .cmd shims cannot be spawned
 * directly (EINVAL on modern Node), so go through cmd.exe /c — the same
 * approach scripts/lib/run.mjs uses for the repo's own tooling.
 */
function spawnCmd(cmd, args, opts) {
  if (process.platform !== "win32") return spawnSync(cmd, args, opts);
  const line = [cmd, ...args].map(quoteArg).join(" ");
  return spawnSync("cmd.exe", ["/d", "/s", "/c", line], { ...opts, shell: false });
}

function runCaptured(cmd, args, cwd, logFile) {
  const out = fs.openSync(logFile, "w");
  try {
    const res = spawnCmd(cmd, args, {
      cwd,
      stdio: ["ignore", out, out],
      windowsHide: true,
    });
    return res.status === 0;
  } finally {
    fs.closeSync(out);
  }
}

function run(cmd, args, cwd) {
  const res = spawnCmd(cmd, args, {
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

/** Step marker + optional emoji prefix shared by spinner and final lines. */
function stepPrefix(e) {
  return mint(sym("diamond")) + "  " + (e && emoji(e) ? e + "  " : "");
}

/**
 * Run fn() under a spinner; the finished line replaces it in place.
 * workingText is shown while running; doneText(result) renders the result.
 */
function runStep(e, workingText, doneText, fn) {
  const spinner = startSpinner(
    (frame) => frame + "  " + (e && emoji(e) ? e + "  " : "") + workingText,
  );
  const result = fn();
  spinner.stop(stepPrefix(e) + doneText(result));
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  let name = "";
  let template = "starter";
  let pm = "";
  let pmFromFlag = false;
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
      pmFromFlag = true;
    } else if (a === "--install") {
      install = true;
    } else if (a === "--no-install") {
      install = false;
    } else if (a === "--no-git") {
      git = false;
    } else if (["--no-color", "--no-emoji", "--ascii"].includes(a)) {
      // handled by detectUiConfig via process.argv
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

  // Ctrl+C during scaffolding: dim cancelled line, exit 130.
  process.on("SIGINT", () => {
    process.stdout.write(`\n${dim(sym("railEnd"))}  ${dim("Cancelled")}\n`);
    process.exit(130);
  });

  if (!name) {
    name = await promptField("Project name", "my-frost-app");
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

  const templateDir = template === "minimal" ? "template-minimal" : "template";
  const src = path.join(__dirname, templateDir);
  if (!fs.existsSync(src)) {
    fail(`Template "${template}" not found in this installation.`);
  }

  // ---- header ----
  console.log(brandHeader([{ text: "Frost", tone: "bold" }], [
    { text: `create-frost-app ${VERSION}`, tone: "dim" },
  ]).join("\n"));
  console.log();

  // ---- summary card (config rows) ----
  console.log(railTitle("Create a new Frost app"));
  console.log(railBlank());
  console.log(
    railField("Project name", [{ text: name, tone: "bold" }]),
  );
  console.log(railField("Template", [{ text: template, tone: "bold" }]));
  const pmValue = [{ text: pm, tone: "bold" }];
  if (!pmFromFlag) pmValue.push({ text: " (detected)", tone: "dim" });
  console.log(railField("Package manager", pmValue));
  console.log(railBlank());

  // ---- steps ----
  runStep(
    "📁",
    dim("Copying template..."),
    () =>
      `Created ${white(template)} ${dim("in")} ${white("./" + name)}`,
    () => {
      copyDir(src, targetDir);
      // npm strips dotfiles from tarballs — templates ship them underscored.
      for (const [from, to] of [
        ["_gitignore", ".gitignore"],
        ["_npmrc", ".npmrc"],
      ]) {
        const f = path.join(targetDir, from);
        if (fs.existsSync(f)) fs.renameSync(f, path.join(targetDir, to));
      }
      const pkgPath = path.join(targetDir, "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.name = name;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      replacePlaceholder(targetDir, name);
      return true;
    },
  );

  const parent = path.dirname(targetDir);
  if (git && commandExists("git") && !insideGitRepo(parent)) {
    runStep(
      "🌱",
      dim("Initializing git repository..."),
      (ok) =>
        ok
          ? "Initialized git repository"
          : dim("(git init skipped — continuing anyway)"),
      () => run("git", ["init"], targetDir),
    );
  }

  let installOk = true;
  if (install) {
    const logFile = path.join(os.tmpdir(), `frost-install-${process.pid}.log`);
    const t0 = Date.now();
    const spinner = startSpinner((frame, elapsed) =>
      frame +
      "  " +
      (emoji("📦") ? "📦  " : "") +
      `Installing dependencies with ${pm}  ` +
      dim(`${Math.floor(elapsed)}s`),
    );
    const ok = runCaptured(pm, ["install"], targetDir, logFile);
    const secs = ((Date.now() - t0) / 1000).toFixed(1).replace(/\.0$/, "");
    if (ok) {
      spinner.stop(
        stepPrefix("📦") +
          `Installed dependencies with ${pm}  ${dim(`${secs}s`)}`,
      );
    } else {
      spinner.stop(
        stepPrefix("📦") + red(`Failed to install dependencies with ${pm}`),
      );
      try {
        const tail = fs
          .readFileSync(logFile, "utf8")
          .split(/\r?\n/)
          .filter((l) => l.length > 0)
          .slice(-20);
        for (const l of tail) console.log(dim(l));
      } catch {
        // log unreadable — skip tail
      }
      console.log(dim(`Retry manually: cd ./${name} && ${PM_RUN[pm].install}`));
      installOk = false;
    }
    try {
      fs.unlinkSync(logFile);
    } catch {
      // best effort
    }
  } else {
    console.log(stepPrefix("📦") + dim("Skipped install"));
  }

  console.log(railBlank());
  console.log(railDone((emoji("🚀") ? "🚀  " : "") + "Your app is ready"));
  console.log();

  // ---- next steps ----
  const cmds = PM_RUN[pm];
  const cmdRow = (cmd, desc) => ({
    segs: [
      { text: padEnd(cmd, 17), tone: "bold" },
      { text: desc, tone: "dim" },
    ],
  });
  const rows = [];
  if (name !== ".") rows.push({ segs: [{ text: `cd ${name}`, tone: "bold" }] });
  if (!install || !installOk) {
    rows.push(cmdRow(cmds.install, "install dependencies"));
  }
  rows.push(
    cmdRow(cmds.dev, "start the dev server"),
    cmdRow(cmds.build, "production build"),
    cmdRow(cmds.start, "serve the production build"),
  );
  for (const line of roundedBox("Next steps", rows)) console.log(line);
  console.log();

  if (!installOk) process.exitCode = 1;
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
