#!/usr/bin/env node
/**
 * docs:check — deterministic documentation verification. No dependencies.
 *
 * Checks:
 *  1. Relative links + heading anchors in README.md and all docs .md files
 *  2. Banned words (rule 6), TODO/lorem text, emoji in headings
 *  3. Every frost.config.ts option appears in docs/reference/configuration.md
 *  4. Every FROST_E_* code appears in docs/reference/error-codes.md
 *  5. Every public export of each package appears in docs/api/<pkg>.md
 *  6. Shell commands in docs reference real scripts or CLI flags
 *
 * Snippet typechecking of fenced ts/tsx blocks is intentionally NOT done
 * here (requires a temp project + tsc); blocks may opt out with
 * `snippet-only` in the fence info string.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (msg) => failures.push(msg);
const ok = (msg) => console.log(`  ok  ${msg}`);

// ---------- file collection ----------
function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git", "assets"].includes(e.name)) continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const mdFiles = [
  path.join(ROOT, "README.md"),
  ...walk(path.join(ROOT, "docs"), [".md"]),
  ...walk(path.join(ROOT, "packages"), ["README.md"]),
].filter((f) => fs.existsSync(f));

// ---------- helpers ----------
const slug = (h) =>
  h.trim().toLowerCase()
    .replace(/[`*_[\]]/g, "")
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .replace(/\s+/g, "-");

function headings(md) {
  return [...md.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1]));
}

function links(md) {
  // [text](target) and <img src="..."> / srcset
  const out = [];
  for (const m of md.matchAll(/\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) out.push(m[1]);
  for (const m of md.matchAll(/\bsrc(?:set)?="([^"]+)"/g)) out.push(m[1]);
  return out;
}

// ---------- 1. links & anchors ----------
console.log("links & anchors");
let linkCount = 0;
for (const file of mdFiles) {
  const md = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);
  const anchors = new Set(headings(md));
  for (const raw of links(md)) {
    if (/^(https?:|mailto:|#)/.test(raw)) {
      if (raw.startsWith("#")) {
        const a = decodeURIComponent(raw.slice(1));
        if (a && !anchors.has(a)) fail(`${rel(file)}: broken anchor #${a}`);
      }
      continue;
    }
    const [target, anchor] = raw.split("#");
    const resolved = path.resolve(dir, decodeURIComponent(target));
    linkCount++;
    if (!fs.existsSync(resolved)) {
      fail(`${rel(file)}: missing link target ${raw}`);
      continue;
    }
    if (anchor && resolved.endsWith(".md")) {
      const targetAnchors = new Set(headings(fs.readFileSync(resolved, "utf8")));
      const a = decodeURIComponent(anchor);
      if (!targetAnchors.has(a)) fail(`${rel(file)}: ${raw} — anchor #${a} not found in ${path.basename(resolved)}`);
    }
  }
}
ok(`${linkCount} relative links checked across ${mdFiles.length} files`);

// ---------- 2. banned words / TODO / emoji headings ----------
console.log("banned language");
const BANNED = [
  /\bblazing\b/i, /\brevolutionary\b/i, /\bsupercharge/i, /\bnext-gen\b/i,
  /\bgame-changing\b/i, /made with love/i, /lorem ipsum/i, /\bTODO\b/, /\bFIXME\b/,
];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
for (const file of mdFiles) {
  const md = fs.readFileSync(file, "utf8");
  md.split("\n").forEach((line, i) => {
    for (const re of BANNED) {
      if (re.test(line)) fail(`${rel(file)}:${i + 1}: banned word/pattern ${re}`);
    }
    if (/^#{1,6}\s/.test(line) && EMOJI.test(line)) {
      fail(`${rel(file)}:${i + 1}: emoji in heading`);
    }
  });
}
ok("banned-word scan done");

// ---------- 3. config coverage ----------
console.log("config coverage");
const configSrc = fs.readFileSync(path.join(ROOT, "packages/core/src/config.ts"), "utf8");
const configDoc = fs.readFileSync(path.join(ROOT, "docs/reference/configuration.md"), "utf8");
const optionNames = new Set();
for (const m of configSrc.matchAll(/^ {2}(\w+)\?:/gm)) optionNames.add(m[1]); // top-level FrostConfig fields
for (const m of configSrc.matchAll(/^ {4}(\w+)\?:/gm)) optionNames.add(m[1]); // nested fields
// Only require top-level + known nested documented options; filter to plausible config keys
const required = [...optionNames].filter((n) =>
  !["default", "maxMemoryEntries", "port", "host", "outDir", "sourcemap",
    "interval", "usePolling", "checkDeterminism", "overlay"].includes(n) || true);
let missing = 0;
for (const name of required) {
  // option may appear as `name` or `section.name` in the doc table
  const re = new RegExp(`(^|[.\\s\`])${name}\\b`);
  if (!re.test(configDoc)) { fail(`configuration.md missing option: ${name}`); missing++; }
}
ok(`config options checked (${required.length} names, ${missing} missing)`);

// ---------- 4. error codes ----------
console.log("error codes");
const diagSrc = fs.readFileSync(path.join(ROOT, "packages/core/src/diagnostics.ts"), "utf8");
const codes = [...diagSrc.matchAll(/"(FROST_E_[A-Z]+)"/g)].map((m) => m[1]);
const codesDoc = fs.readFileSync(path.join(ROOT, "docs/reference/error-codes.md"), "utf8");
for (const c of new Set(codes)) {
  if (!codesDoc.includes(c)) fail(`error-codes.md missing ${c}`);
}
ok(`${new Set(codes).size} FROST_E_* codes documented`);

// ---------- 5. public exports per package ----------
console.log("api coverage");
const packages = ["core", "router", "data", "react", "server", "adapter-node", "vite", "test", "cli"];
const exportRe = /^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm;
for (const pkg of packages) {
  const apiFile = path.join(ROOT, `docs/api/${pkg}.md`);
  if (!fs.existsSync(apiFile)) { fail(`missing docs/api/${pkg}.md`); continue; }
  const doc = fs.readFileSync(apiFile, "utf8");
  const srcDir = path.join(ROOT, `packages/${pkg}/src`);
  const names = new Set();
  for (const f of walk(srcDir, [".ts", ".tsx"])) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(exportRe)) names.add(m[1]);
  }
  // skip internal-ish helpers unlikely to be public surface? No — spec says every public export.
  // But index.ts uses `export *`, so all named exports are public. Check name appears in doc.
  const missing = [...names].filter((n) => !new RegExp(`\\b${n}\\b`).test(doc));
  if (missing.length) fail(`docs/api/${pkg}.md missing exports: ${missing.join(", ")}`);
  else ok(`${pkg}: ${names.size} exports covered`);
}

// ---------- 6. shell commands ----------
console.log("commands");
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const scripts = new Set(Object.keys(pkgJson.scripts));
const cliSrc = fs.readFileSync(path.join(ROOT, "packages/cli/src/bin.ts"), "utf8");
const cliCommands = new Set([...cliSrc.matchAll(/case "(\w+)":/g)].map((m) => m[1]));
// Script names that exist in scaffolded apps (package.json of generated projects)
// even though they are not root monorepo scripts.
const COMMON_APP_SCRIPTS = new Set(["dev", "start", "typecheck", "build"]);
for (const file of mdFiles) {
  const md = fs.readFileSync(file, "utf8");
  for (const m of md.matchAll(/```bash\n([\s\S]*?)```/g)) {
    for (const line of m[1].split("\n")) {
      let t = line.trim();
      if (!t || t.startsWith("#")) continue;
      t = t.split(" #")[0].trim(); // strip inline comments
      if (!t) continue;
      const cmd = t.split(/\s+/)[0].replace(/^.*\//, "");
      if (["pnpm", "npm", "npx", "frost", "node", "git", "cd", "curl", "taskkill", "netstat", "corepack"].includes(cmd)) {
        if (cmd === "pnpm" || cmd === "npm") {
          const sub = t.split(/\s+/)[1];
          if (sub === "run" || sub === "-") {
            const script = t.split(/\s+/)[2];
            if (script && !scripts.has(script) && !COMMON_APP_SCRIPTS.has(script)) fail(`${rel(file)}: unknown script "${script}"`);
          } else if (sub && scripts.has(sub)) {
            // pnpm <script>
          } else if (sub && COMMON_APP_SCRIPTS.has(sub)) {
            // script name from scaffolded projects (dev/start/typecheck)
          } else if (sub && ["create", "install", "view", "cache", "login", "whoami", "publish", "stage", "changeset"].includes(sub)) {
            // ok
          } else {
            fail(`${rel(file)}: unverified command "${t}"`);
          }
        } else if (cmd === "frost") {
          const sub = t.split(/\s+/)[1];
          if (sub && !cliCommands.has(sub) && !sub.startsWith("-")) fail(`${rel(file)}: unknown frost command "${sub}"`);
        } else if (cmd === "node") {
          const target = t.split(/\s+/)[1];
          if (target && target.endsWith(".mjs") && !fs.existsSync(path.join(ROOT, target))) {
            fail(`${rel(file)}: node target not found ${target}`);
          }
        }
      }
    }
  }
}
ok("command scan done");

function rel(f) { return path.relative(ROOT, f).replace(/\\/g, "/"); }

// ---------- report ----------
if (failures.length) {
  console.error(`\ndocs:check FAILED — ${failures.length} issue(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("\ndocs:check OK");
