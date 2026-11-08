// Generates packages/create-frost-app/template/ from examples/starter —
// the single source of truth for the default scaffold.
//
// - Copies git-tracked starter files only (node_modules, .frost, dist,
//   env files, coverage, tests, DESIGN.md are all excluded automatically).
// - Rewrites package.json: "__APP_NAME__" name, workspace:^/* deps become
//   ^<current workspace version>, keeps only dev/build/start/typecheck.
// - Inlines tsconfig.json "extends" from the monorepo base config and
//   strips composite/references/incremental fields.
// - Fails if the output still contains workspace:/file: ranges, imports
//   that escape the project root, or absolute machine paths.
// - Deterministic: sorted file list, stable JSON formatting.
//
// Usage: node scripts/sync-template.mjs [--check]
//   --check  regenerate into a temp dir and diff against template/
//            (used by check:template as the drift guard)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STARTER = path.join(root, "examples", "starter");
const OUT = path.join(root, "packages", "create-frost-app", "template");
const checkOnly = process.argv.includes("--check");

const EXCLUDED_NAMES = new Set(["DESIGN.md"]);
const EXCLUDED_DIRS = new Set(["__tests__", "node_modules", ".frost", "dist", "coverage"]);
const TEST_FILE_RE = /\.(test|spec)\.[tj]sx?$/;
const TEXT_EXT_RE = /\.(tsx?|jsx?|mjs|cjs|json|css|html|md|toml|yaml|yml|txt|svg|webmanifest)$/;

function fail(msg) {
  console.error(`sync-template: ${msg}`);
  process.exit(1);
}

// ---- collect source files: git-tracked only (honors .gitignore) ----
function listSourceFiles() {
  const res = spawnSync("git", ["-C", STARTER, "ls-files", "-z"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (res.status !== 0) fail(`git ls-files failed: ${res.stderr}`);
  return res.stdout
    .split("\0")
    .filter(Boolean)
    .map((f) => f.split("/").join(path.sep))
    .filter((rel) => {
      const parts = rel.split(path.sep);
      if (parts.some((p) => EXCLUDED_DIRS.has(p))) return false;
      const base = parts[parts.length - 1];
      if (EXCLUDED_NAMES.has(base)) return false;
      if (TEST_FILE_RE.test(base)) return false;
      if (base.startsWith(".env")) return false;
      if (base.endsWith(".tsbuildinfo")) return false;
      return true;
    })
    .sort();
}

// ---- workspace versions ----
function workspaceVersions() {
  const versions = new Map();
  const pkgRoot = path.join(root, "packages");
  for (const dir of fs.readdirSync(pkgRoot)) {
    const pj = path.join(pkgRoot, dir, "package.json");
    if (!fs.existsSync(pj)) continue;
    const pkg = JSON.parse(fs.readFileSync(pj, "utf8"));
    versions.set(pkg.name, pkg.version);
  }
  return versions;
}

// ---- tsconfig: inline extends, strip build-orchestration fields ----
const TSCONFIG_STRIP = new Set([
  "composite",
  "incremental",
  "tsBuildInfoFile",
  "references",
  "rootDir",
]);

function resolveExtends(file) {
  // Resolve a (possibly relative) tsconfig extends chain into one object.
  const seen = new Set();
  const chain = [];
  let current = file;
  while (current) {
    const real = path.resolve(current);
    if (seen.has(real)) break;
    seen.add(real);
    const cfg = JSON.parse(fs.readFileSync(real, "utf8"));
    chain.unshift(cfg);
    if (typeof cfg.extends === "string") {
      current = path.resolve(path.dirname(real), cfg.extends.endsWith(".json") ? cfg.extends : `${cfg.extends}.json`);
      if (!current.endsWith(".json")) current += ".json";
    } else {
      current = null;
    }
  }
  // merge: later (child) wins
  const merged = { compilerOptions: {} };
  for (const cfg of chain) {
    if (cfg.compilerOptions) Object.assign(merged.compilerOptions, cfg.compilerOptions);
    for (const k of Object.keys(cfg)) {
      if (k !== "compilerOptions" && k !== "extends") merged[k] = cfg[k];
    }
  }
  return merged;
}

function buildTsconfig(versions) {
  const starterCfgPath = path.join(STARTER, "tsconfig.json");
  const merged = resolveExtends(starterCfgPath);
  const co = merged.compilerOptions ?? {};
  for (const k of TSCONFIG_STRIP) delete co[k];
  // The generated routes types live under .frost/types (produced by
  // `frost build`/`dev`); keep the include but it is optional.
  const out = {
    compilerOptions: {
      target: co.target ?? "ES2022",
      module: co.module ?? "NodeNext",
      moduleResolution: co.moduleResolution ?? "NodeNext",
      lib: co.lib ?? ["ES2022", "DOM", "DOM.Iterable"],
      jsx: co.jsx ?? "react-jsx",
      strict: co.strict ?? true,
      skipLibCheck: co.skipLibCheck ?? true,
      esModuleInterop: co.esModuleInterop ?? true,
      forceConsistentCasingInFileNames: co.forceConsistentCasingInFileNames ?? true,
      noEmit: true,
      types: co.types,
    },
    include: merged.include ?? ["src/**/*", ".frost/types/**/*"],
  };
  // drop undefined optional keys for deterministic output
  for (const k of Object.keys(out.compilerOptions)) {
    if (out.compilerOptions[k] === undefined) delete out.compilerOptions[k];
  }
  return out;
}

// ---- package.json rewrite ----
const KEEP_SCRIPTS = ["dev", "build", "start", "typecheck"];

function rewritePackageJson(versions) {
  const pkg = JSON.parse(fs.readFileSync(path.join(STARTER, "package.json"), "utf8"));
  const out = {
    name: "__APP_NAME__",
    type: pkg.type ?? "module",
    scripts: {},
    dependencies: {},
    devDependencies: {},
  };
  for (const key of KEEP_SCRIPTS) {
    if (pkg.scripts?.[key]) out.scripts[key] = pkg.scripts[key];
  }
  // ensure typecheck exists even if starter lacks it
  if (!out.scripts.typecheck) out.scripts.typecheck = "tsc --noEmit";
  for (const section of ["dependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(pkg[section] ?? {})) {
      let value = range;
      const m = /^workspace[:*^]?(.+)$/.exec(range);
      if (m) {
        const ver = versions.get(name);
        if (!ver) fail(`workspace dep ${name} has no known version`);
        value = `^${ver}`;
      }
      out[section][name] = value;
    }
    // stable key order
    out[section] = Object.fromEntries(Object.entries(out[section]).sort(([a], [b]) => a.localeCompare(b)));
  }
  return out;
}

// ---- validation ----
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;
// Drive-letter paths must not be preceded by a letter (excludes https://).
const ABS_PATH_RE = /(?:^|[^A-Za-z])[A-Za-z]:[\\/]|(?:\/Users\/[^\s"'`]+)|(?:\/home\/[^\s"'`]+)|file:\/\//;

function validateOutput(outDir) {
  const problems = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
        continue;
      }
      const rel = path.relative(outDir, full).split(path.sep).join("/");
      if (!TEXT_EXT_RE.test(e.name) && e.name !== "_gitignore") continue;
      const text = fs.readFileSync(full, "utf8");
      // 'file:' only counts inside quotes (import specifiers / dep ranges);
      // a bare `file:` field name in source is fine.
      if (/workspace:|"file:|'file:/.test(text)) {
        problems.push(`${rel}: contains workspace:/file: range`);
      }
      if (ABS_PATH_RE.test(text)) {
        problems.push(`${rel}: contains an absolute path`);
      }
      // relative imports must stay inside the project
      for (const m of text.matchAll(IMPORT_RE)) {
        const spec = m[1] ?? m[2] ?? m[3];
        if (!spec || !spec.startsWith(".")) continue;
        const resolved = path.resolve(path.dirname(full), spec);
        const relToOut = path.relative(outDir, resolved);
        if (relToOut.startsWith("..") || path.isAbsolute(relToOut)) {
          problems.push(`${rel}: import "${spec}" escapes the project`);
        }
      }
    }
  };
  walk(outDir);
  return problems;
}

// ---- copy ----
function generate(destDir) {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  const versions = workspaceVersions();
  const files = listSourceFiles();

  const written = [];
  for (const rel of files) {
    const src = path.join(STARTER, rel);
    let destRel = rel;
    let content;
    if (rel === "package.json") {
      content = JSON.stringify(rewritePackageJson(versions), null, 2) + "\n";
    } else if (rel === "tsconfig.json") {
      content = JSON.stringify(buildTsconfig(versions), null, 2) + "\n";
    } else {
      content = fs.readFileSync(src);
      destRel = rel === ".gitignore" ? "_gitignore" : rel;
    }
    const dest = path.join(destDir, destRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
    written.push(destRel.split(path.sep).join("/"));
  }

  // starter has no .gitignore — ship a standard one
  if (!written.includes("_gitignore")) {
    fs.writeFileSync(
      path.join(destDir, "_gitignore"),
      "node_modules/\n.frost/\ndist/\n*.log\n.env*.local\n",
    );
    written.push("_gitignore");
  }

  // starter has no README — ship a minimal one
  if (!written.includes("README.md")) {
    fs.writeFileSync(
      path.join(destDir, "README.md"),
      [
        "# __APP_NAME__",
        "",
        "A [Frost](https://frostjs.dev) application.",
        "",
        "## Commands",
        "",
        "```bash",
        "npm run dev        # dev server with auto reload",
        "npm run build      # production build into .frost/",
        "npm run start      # serve the production build",
        "npm run typecheck  # tsc --noEmit",
        "```",
        "",
        "Routes live in `src/app` (`page.tsx` = route, `layout.tsx` =",
        "layout), API endpoints in `src/api`. See https://frostjs.dev/docs.",
        "",
      ].join("\n"),
    );
    written.push("README.md");
  }

  const problems = validateOutput(destDir);
  if (problems.length) {
    for (const p of problems) console.error(`  - ${p}`);
    fail(`${problems.length} validation problem(s)`);
  }
  return written;
}

function diffDirs(a, b) {
  const list = (dir) => {
    const out = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else out.push(path.relative(dir, full).split(path.sep).join("/"));
      }
    };
    walk(dir);
    return out.sort();
  };
  const la = list(a);
  const lb = list(b);
  const diffs = [];
  for (const f of la) {
    if (!lb.includes(f)) diffs.push(`only in generated: ${f}`);
    else if (!fs.readFileSync(path.join(a, f)).equals(fs.readFileSync(path.join(b, f)))) {
      diffs.push(`content differs: ${f}`);
    }
  }
  for (const f of lb) if (!la.includes(f)) diffs.push(`only in template/: ${f}`);
  return diffs;
}

if (checkOnly) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "frost-template-check-"));
  try {
    // 1. determinism: two generations must be byte-identical
    const a = path.join(tmp, "a");
    const b = path.join(tmp, "b");
    generate(a);
    generate(b);
    const detDiffs = diffDirs(a, b);
    if (detDiffs.length) {
      for (const d of detDiffs.slice(0, 20)) console.error(`  - ${d}`);
      fail(`sync-template is not deterministic (${detDiffs.length} difference(s))`);
    }
    // 2. drift: if template/ exists in the working tree it must match
    if (fs.existsSync(OUT)) {
      const diffs = diffDirs(a, OUT);
      if (diffs.length) {
        for (const d of diffs.slice(0, 30)) console.error(`  - ${d}`);
        fail(`template/ is stale (${diffs.length} difference(s)) — run: node scripts/sync-template.mjs`);
      }
      console.log("check:template OK — template/ matches examples/starter");
    } else {
      console.log("check:template OK — template generation is deterministic");
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
} else {
  const files = generate(OUT);
  console.log(`sync-template: wrote ${files.length} files to packages/create-frost-app/template/`);
}
