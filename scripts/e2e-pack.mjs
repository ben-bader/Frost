#!/usr/bin/env node
// End-to-end packaging test — NO npm registry access.
//
// 1. pnpm build (all packages)
// 2. pnpm pack every package into a temp dir
// 3. Run the packed create-frost-app bin to scaffold an app
// 4. Rewrite every dependency (direct + transitive via overrides) to local
//    file: references — @frost.js/* -> tarballs, everything else -> the
//    already-installed copies in this repo's node_modules
// 5. npm install --offline, typecheck, build, start prod server
// 6. Assert HTTP 200 + content for / and /playground, compression headers
// 7. Kill the server tree, print PASS/FAIL table
//
// Usage: node scripts/e2e-pack.mjs [--keep] [--skip-build]
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { run, runOrFail } from "./lib/run.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");
const skipBuild = process.argv.includes("--skip-build");

// Dependency order (leaf first); create-frost-app last.
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

const results = [];
let serverProc = null;
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// run/runOrFail come from ./lib/run.mjs — cmd.exe /c shim on Windows,
// no shell:true (avoids DEP0190).

// ---------- semver (borrowed from the workspace store) ----------
function loadSemver() {
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  const candidates = fs
    .readdirSync(pnpmDir)
    .filter((d) => /^semver@7\./.test(d))
    .map((d) => path.join(pnpmDir, d, "node_modules", "semver"));
  for (const dir of candidates) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      const entry = path.join(dir, pkg.main ?? "index.js");
      return createRequire(import.meta.url)(entry);
    } catch {
      /* try next */
    }
  }
  throw new Error("Could not load semver from node_modules/.pnpm");
}
const semver = loadSemver();

// ---------- package dir resolution ----------
const NM_DIRS = [
  path.join(root, "node_modules"),
  ...fs
    .readdirSync(path.join(root, "packages"))
    .map((d) => path.join(root, "packages", d, "node_modules")),
  path.join(root, "examples", "starter", "node_modules"),
].filter((d) => fs.existsSync(d));

function findPackageDir(name) {
  const candidates = [];
  const seen = new Set();
  const consider = (p) => {
    const pkgJson = path.join(p, "package.json");
    if (!fs.existsSync(pkgJson) || seen.has(p)) return;
    seen.add(p);
    try {
      const real = fs.realpathSync(p);
      const pkg = JSON.parse(fs.readFileSync(path.join(real, "package.json"), "utf8"));
      candidates.push({ dir: real, version: pkg.version });
    } catch {
      /* skip */
    }
  };
  for (const nm of NM_DIRS) consider(path.join(nm, name));
  // pnpm keeps non-hoisted packages inside .pnpm/<entry>/node_modules/<name>
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      consider(path.join(pnpmDir, entry, "node_modules", name));
    }
  }
  return candidates;
}

function satisfiesAny(version, range) {
  if (!range || range === "*" || range === "latest") return true;
  try {
    return semver.satisfies(version, range, { includePrerelease: true });
  } catch {
    return true; // unparseable range — accept the only installed copy
  }
}

function resolveDep(name, range) {
  const candidates = findPackageDir(name);
  if (candidates.length === 0) return null;
  const ok = candidates.filter((c) => satisfiesAny(c.version, range));
  const pool = ok.length ? ok : candidates;
  // prefer the highest version
  pool.sort((a, b) => semver.rcompare(a.version, b.version));
  return pool[0];
}

// ---------- main ----------
const workBase = path.join(root, ".e2e-tmp");
fs.rmSync(workBase, { recursive: true, force: true });
fs.mkdirSync(workBase, { recursive: true });
const tarballDir = path.join(workBase, "tarballs");
const appDir = path.join(workBase, "e2e-app");
fs.mkdirSync(tarballDir, { recursive: true });

try {
  // 1. build
  if (!skipBuild) {
    console.log("== pnpm build ==");
    runOrFail("pnpm", ["-r", "run", "build"], "pnpm build");
    check("workspace build", true);
  }

  // 2. pack every package
  console.log("== pnpm pack ==");
  const tgz = {}; // name -> absolute tarball path
  for (const [name, dir] of PACKAGES) {
    const dest = path.join(tarballDir, name.replace("@", "").replace("/", "-"));
    fs.mkdirSync(dest, { recursive: true });
    runOrFail("pnpm", ["pack", "--pack-destination", dest], `pack ${name}`, {
      cwd: path.join(root, "packages", dir),
    });
    const files = fs.readdirSync(dest).filter((f) => f.endsWith(".tgz"));
    if (files.length !== 1) throw new Error(`expected 1 tarball for ${name}, got ${files}`);
    tgz[name] = path.join(dest, files[0]);
  }
  check("pack all packages", true, `${Object.keys(tgz).length} tarballs`);

  // tarball contents sanity: no src/, no tests
  {
    const res = run("tar", ["--force-local", "-tzf", tgz["@frost.js/core"].split(path.sep).join("/")]);
    const list = res.stdout || "";
    check(
      "core tarball clean",
      !list.includes("/src/") && !list.includes("__tests__") && list.includes("/dist/"),
    );
  }

  // 3. scaffold via the packed bin
  console.log("== scaffold ==");
  const cfaDest = path.join(tarballDir, "create-frost-app-extract");
  fs.mkdirSync(cfaDest, { recursive: true });
  runOrFail("tar", ["--force-local", "-xzf", tgz["create-frost-app"].split(path.sep).join("/"), "-C", cfaDest.split(path.sep).join("/")], "extract create-frost-app");
  const binPath = path.join(cfaDest, "package", "bin.js");
  check("packed bin.js exists + LF", fs.existsSync(binPath) && !fs.readFileSync(binPath).includes("\r"));

  const scaffold = runOrFail(
    process.execPath,
    [binPath, "e2e-app", "--no-install", "--no-git"],
    "scaffold",
    { cwd: workBase },
  );
  check("scaffold exit 0", scaffold.status === 0);
  check(
    "scaffold output (starter template)",
    fs.existsSync(path.join(appDir, "package.json")) &&
      fs.existsSync(path.join(appDir, "src/app/playground/page.tsx")) &&
      fs.existsSync(path.join(appDir, "src/components/bento/CounterTile.tsx")) &&
      fs.existsSync(path.join(appDir, "postcss.config.mjs")) &&
      fs.existsSync(path.join(appDir, ".gitignore")),
  );

  // the scaffolded package.json must be registry-ready: real semver
  // ranges, no workspace:/file: specs (checked BEFORE the e2e rewrite)
  {
    const raw = fs.readFileSync(path.join(appDir, "package.json"), "utf8");
    check(
      "scaffolded package.json has no workspace:/file: ranges",
      !/workspace:|"file:|'file:/.test(raw),
    );
  }

  // 4. rewrite deps -> local file: refs
  console.log("== rewrite deps ==");
  const appPkgPath = path.join(appDir, "package.json");
  const appPkg = JSON.parse(fs.readFileSync(appPkgPath, "utf8"));

  const toRel = (abs) => {
    let rel = path.relative(appDir, abs).split(path.sep).join("/");
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return `file:${rel}`;
  };

  // collect every external dep name needed by the app + frost tarballs
  const needed = new Map(); // name -> range
  const addNeed = (name, range) => {
    if (name.startsWith("@frost.js/") || name === "create-frost-app") return;
    if (!needed.has(name)) needed.set(name, range || "*");
  };
  for (const section of ["dependencies", "devDependencies"]) {
    for (const [n, r] of Object.entries(appPkg[section] ?? {})) addNeed(n, r);
  }
  for (const [, dir] of PACKAGES) {
    if (dir === "create-frost-app") continue;
    const p = JSON.parse(
      fs.readFileSync(path.join(root, "packages", dir, "package.json"), "utf8"),
    );
    for (const section of ["dependencies", "peerDependencies"]) {
      for (const [n, r] of Object.entries(p[section] ?? {})) addNeed(n, r);
    }
  }
  // vite is a peer of @frost.js/vite — make it explicit so npm doesn't try
  // to auto-install it from the registry.
  addNeed("vite", "^6.2.0");

  // BFS the dependency closure through installed packages.
  // Optionality propagates: a dep reachable only through optional edges is
  // optional (e.g. fsevents on Windows, @napi-rs/wasm-runtime via the WASI
  // build of @tailwindcss/oxide). A name enqueued as required wins over an
  // earlier optional sighting.
  const resolved = new Map(); // name -> {dir, version}
  const skipped = new Set();
  const hardReq = new Set();
  const queue = [];
  const enqueue = (name, range, opt) => {
    if (!opt) hardReq.add(name);
    if (resolved.has(name)) return;
    if (skipped.has(name) && !hardReq.has(name)) return;
    queue.push({ name, range, opt });
  };
  for (const [n, r] of needed) enqueue(n, r, false);
  while (queue.length) {
    const { name, range, opt } = queue.shift();
    if (resolved.has(name)) continue;
    if (skipped.has(name) && !hardReq.has(name)) continue;
    const hit = resolveDep(name, range);
    if (!hit) {
      if (opt || !hardReq.has(name)) {
        skipped.add(name);
        continue;
      }
      console.error(`  unresolved dependency: ${name}@${range}`);
      check("dependency closure", false, name);
      throw new Error(`unresolved ${name}`);
    }
    resolved.set(name, hit);
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(hit.dir, "package.json"), "utf8"));
    } catch {
      continue;
    }
    const optionalPeers = new Set(
      Object.keys(pkg.peerDependenciesMeta ?? {}).filter(
        (k) => pkg.peerDependenciesMeta[k]?.optional,
      ),
    );
    for (const [n, r] of Object.entries(pkg.dependencies ?? {})) {
      enqueue(n, r, opt);
    }
    for (const [n, r] of Object.entries(pkg.optionalDependencies ?? {})) {
      enqueue(n, r, true);
    }
    for (const [n, r] of Object.entries(pkg.peerDependencies ?? {})) {
      if (!optionalPeers.has(n)) enqueue(n, r, opt);
    }
  }
  check("dependency closure", true, `${resolved.size} packages resolved locally`);

  // rewrite app package.json + generate overrides for transitive deps
  const overrides = {};
  for (const [name, hit] of resolved) overrides[name] = toRel(hit.dir);
  for (const section of ["dependencies", "devDependencies"]) {
    for (const [n] of Object.entries(appPkg[section] ?? {})) {
      if (n.startsWith("@frost.js/")) {
        appPkg[section][n] = toRel(tgz[n]);
      } else if (resolved.has(n)) {
        appPkg[section][n] = toRel(resolved.get(n).dir);
      }
    }
  }
  if (!appPkg.dependencies.vite && resolved.has("vite")) {
    appPkg.dependencies.vite = toRel(resolved.get("vite").dir);
  }
  appPkg.overrides = overrides;
  fs.writeFileSync(appPkgPath, JSON.stringify(appPkg, null, 2) + "\n");

  // 5. npm install — fully offline
  console.log("== npm install (offline) ==");
  const install = run(
    "npm",
    ["install", "--no-audit", "--no-fund", "--offline", "--loglevel=error"],
    { cwd: appDir },
  );
  check(
    "npm install --offline",
    install.status === 0,
    install.status === 0 ? "" : (install.stderr || install.stdout || "").slice(-500),
  );
  if (install.status !== 0) throw new Error("npm install failed");

  // sanity: no registry deps left unresolved — every node_modules entry
  // should trace to file: (skip deep check; install success is the gate)

  // 6. typecheck + build
  console.log("== typecheck ==");
  const tsc = run(
    process.execPath,
    [path.join(appDir, "node_modules", "typescript", "bin", "tsc"), "--noEmit"],
    { cwd: appDir },
  );
  check("npm run typecheck", tsc.status === 0, tsc.status === 0 ? "" : (tsc.stderr || "").slice(-500));

  console.log("== frost build ==");
  const build = run(
    process.execPath,
    [path.join(appDir, "node_modules", "@frost.js", "cli", "dist", "bin.js"), "build"],
    { cwd: appDir },
  );
  check("frost build", build.status === 0, build.status === 0 ? "" : (build.stderr || build.stdout || "").slice(-800));
  if (build.status !== 0) throw new Error("build failed");

  // 7. start prod server on a free port
  console.log("== prod server ==");
  const port = await new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
  const cfgPath = path.join(appDir, "frost.config.ts");
  fs.writeFileSync(
    cfgPath,
    fs.readFileSync(cfgPath, "utf8").replace(/port:\s*\d+/, `port: ${port}`),
  );
  // rebuild not needed — port is read at server start from config? frost
  // start reads frost.config.ts at runtime, so the edit is enough.

  serverProc = spawn(
    process.execPath,
    [path.join(appDir, "node_modules", "@frost.js", "cli", "dist", "bin.js"), "start"],
    { cwd: appDir, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  const server = serverProc;
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d));
  server.stderr.on("data", (d) => (serverLog += d));

  const base = `http://localhost:${port}`;
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    try {
      const r = await fetch(`${base}/`, { headers: { "accept-encoding": "br, gzip" } });
      ready = r.status === 200;
      await r.arrayBuffer();
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  check("server started", ready, ready ? "" : serverLog.slice(-400));

  if (ready) {
    const get = async (p) => {
      const r = await fetch(`${base}${p}`, {
        headers: { "accept-encoding": "br, gzip" },
      });
      const body = await r.text();
      return { status: r.status, headers: r.headers, body };
    };

    const home = await get("/");
    check("GET / -> 200", home.status === 200, `got ${home.status}`);
    check(
      "GET / content-type html",
      (home.headers.get("content-type") ?? "").includes("text/html"),
      home.headers.get("content-type") ?? "",
    );
    check("GET / hero content", home.body.includes("React rendering"));
    const enc = home.headers.get("content-encoding") ?? "";
    check("GET / compressed (br|gzip)", enc === "br" || enc === "gzip", enc || "none");

    // stylesheet <link> must be present and serve real Tailwind CSS
    const cssHref = home.body.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1]
      ?? home.body.match(/<link[^>]+href="([^"]+\.css[^"]*)"[^>]+rel="stylesheet"/)?.[1];
    check("GET / has stylesheet <link>", Boolean(cssHref), cssHref ?? "none found");
    if (cssHref) {
      const cssUrl = new URL(cssHref, base).href;
      const css = await fetch(cssUrl, { headers: { "accept-encoding": "br, gzip" } });
      const cssText = await css.text();
      check("stylesheet -> 200", css.status === 200, `got ${css.status} for ${cssUrl}`);
      check(
        "stylesheet content-type css",
        (css.headers.get("content-type") ?? "").includes("text/css"),
        css.headers.get("content-type") ?? "",
      );
      check(
        "stylesheet contains Tailwind token (--color-ink-hi)",
        cssText.includes("--color-ink-hi") || cssText.includes("10e8c8"),
      );
    }

    const pg = await get("/playground");
    check("GET /playground -> 200", pg.status === 200, `got ${pg.status}`);
    check(
      "GET /playground markup",
      pg.body.includes("Playground") && (pg.body.includes("Counter") || pg.body.includes("counter") || pg.body.includes("aria-live")),
    );
  }
} catch (err) {
  check("e2e completed", false, err instanceof Error ? err.message : String(err));
} finally {
  // stop the prod server and its whole process tree
  if (serverProc) {
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(serverProc.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } else {
        serverProc.kill("SIGTERM");
      }
    } catch {
      /* ignore */
    }
  }
}

console.log("\n===== E2E RESULTS =====");
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
if (!keep) fs.rmSync(workBase, { recursive: true, force: true });
process.exit(failed === 0 ? 0 : 1);
