import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(__dirname, "..", "..", "bin.js");

let tmp: string;

function runBin(args: string[], cwd = tmp) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "create-frost-app-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("create-frost-app bin", () => {
  it("scaffolds a named minimal app", () => {
    const res = runBin(["my-app", "--no-install", "--no-git"]);
    expect(res.status).toBe(0);
    const dir = path.join(tmp, "my-app");
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "src/app/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "_gitignore"))).toBe(false);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("my-app");
    expect(pkg.dependencies["@frost.js/core"]).toMatch(/^\^/);
    expect(pkg.dependencies["@frost.js/core"]).not.toContain("workspace:");
  });

  it("scaffolds the tailwind template", () => {
    const res = runBin(["tw-app", "--template", "tailwind", "--no-install", "--no-git"]);
    expect(res.status).toBe(0);
    const dir = path.join(tmp, "tw-app");
    expect(fs.existsSync(path.join(dir, "postcss.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "src/styles/app.css"))).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    expect(pkg.dependencies.tailwindcss).toBeDefined();
  });

  it("replaces __APP_NAME__ in README and page metadata", () => {
    runBin(["named-app", "--no-install", "--no-git"]);
    const dir = path.join(tmp, "named-app");
    const readme = fs.readFileSync(path.join(dir, "README.md"), "utf8");
    const page = fs.readFileSync(path.join(dir, "src/app/page.tsx"), "utf8");
    expect(readme).toContain("named-app");
    expect(page).toContain("named-app");
    expect(readme).not.toContain("__APP_NAME__");
  });

  it("refuses a non-empty target directory", () => {
    const dir = path.join(tmp, "occupied");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "file.txt"), "x");
    const res = runBin(["occupied", "--no-install", "--no-git"]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("not empty");
  });

  it("rejects invalid names", () => {
    for (const bad of [".", "..", "a/b", "C:/abs/path", "a:b", "../escape"]) {
      const res = runBin([bad, "--no-install", "--no-git"]);
      expect(res.status).not.toBe(0);
      expect(res.stderr.toLowerCase()).toContain("invalid");
    }
  });

  it("works when the path contains spaces", () => {
    const spaced = path.join(tmp, "dir with spaces");
    fs.mkdirSync(spaced);
    const res = runBin(["spaced app".replace(" ", "-"), "--no-install", "--no-git"], spaced);
    // name arg "spaced-app" created inside the spaced cwd
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(spaced, "spaced-app", "package.json"))).toBe(true);
  });

  it("prints next steps and exits 0 with --help", () => {
    const res = runBin(["--help"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("npm create frost-app");
  });
});
