import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(__dirname, "..", "..");
const BIN = path.join(PKG_DIR, "bin.js");
const SYNC = path.resolve(PKG_DIR, "..", "..", "scripts", "sync-template.mjs");

let tmp: string;

function runBin(args: string[], cwd = tmp) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

beforeAll(() => {
  // template/ is generated from examples/starter — ensure it exists
  // even on a fresh clone where prepack has not run yet.
  const res = spawnSync(process.execPath, [SYNC], { encoding: "utf8", windowsHide: true });
  if (res.status !== 0) throw new Error(`sync-template failed: ${res.stderr}`);
});

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

function freshTmp() {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "create-frost-app-"));
  return tmp;
}

describe("create-frost-app bin", () => {
  it("scaffolds the full starter template by default", () => {
    freshTmp();
    const res = runBin(["my-app", "--no-install", "--no-git"]);
    expect(res.status).toBe(0);
    const dir = path.join(tmp, "my-app");
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "_gitignore"))).toBe(false);
    // starter-specific files
    expect(fs.existsSync(path.join(dir, "src/components/bento/CounterTile.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "src/app/playground/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "src/styles/app.css"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "public/favicon.png"))).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("my-app");
    expect(pkg.dependencies["@frost.js/core"]).toMatch(/^\^/);
    expect(pkg.dependencies["@frost.js/core"]).not.toContain("workspace:");
    expect(pkg.dependencies.tailwindcss).toBeDefined();
  });

  it("scaffolds the minimal template with --template minimal", () => {
    freshTmp();
    const res = runBin(["mini-app", "--template", "minimal", "--no-install", "--no-git"]);
    expect(res.status).toBe(0);
    const dir = path.join(tmp, "mini-app");
    expect(fs.existsSync(path.join(dir, "src/app/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "src/components/ClientCounter.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "postcss.config.mjs"))).toBe(false);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("mini-app");
    expect(pkg.dependencies["@frost.js/core"]).not.toContain("workspace:");
  });

  it("rejects unknown template names", () => {
    freshTmp();
    for (const bad of ["tailwind", "bogus", "minimal "]) {
      const res = runBin(["x-app", "--template", bad, "--no-install", "--no-git"]);
      expect(res.status).not.toBe(0);
      expect(res.stderr.toLowerCase()).toContain("unknown template");
    }
  });

  it("replaces __APP_NAME__ in README and metadata", () => {
    freshTmp();
    runBin(["named-app", "--no-install", "--no-git"]);
    const dir = path.join(tmp, "named-app");
    const readme = fs.readFileSync(path.join(dir, "README.md"), "utf8");
    expect(readme).toContain("named-app");
    expect(readme).not.toContain("__APP_NAME__");
  });

  it("refuses a non-empty target directory", () => {
    freshTmp();
    const dir = path.join(tmp, "occupied");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "file.txt"), "x");
    const res = runBin(["occupied", "--no-install", "--no-git"]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("not empty");
  });

  it("rejects invalid names", () => {
    freshTmp();
    for (const bad of [".", "..", "a/b", "C:/abs/path", "a:b", "../escape"]) {
      const res = runBin([bad, "--no-install", "--no-git"]);
      expect(res.status).not.toBe(0);
      expect(res.stderr.toLowerCase()).toContain("invalid");
    }
  });

  it("works when the path contains spaces", () => {
    const spaced = fs.mkdtempSync(path.join(os.tmpdir(), "dir with spaces-"));
    tmp = spaced;
    const res = runBin(["spaced-app", "--no-install", "--no-git"], spaced);
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(spaced, "spaced-app", "package.json"))).toBe(true);
  });

  it("prints help and exits 0", () => {
    freshTmp();
    const res = runBin(["--help"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("starter");
    expect(res.stdout).toContain("minimal");
  });
});
