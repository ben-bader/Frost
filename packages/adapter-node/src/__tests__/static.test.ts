import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resolveStaticPath } from "../static.js";

describe("resolveStaticPath containment", () => {
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "frost-static-"));
    fs.mkdirSync(path.join(root, "assets"), { recursive: true });
    fs.writeFileSync(path.join(root, "assets", "app.js"), "console.log(1)");
    fs.writeFileSync(path.join(root, "index.html"), "<h1>hi</h1>");
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("resolves normal paths inside the root", () => {
    const p = resolveStaticPath(root, "/assets/app.js");
    expect(p).not.toBeNull();
    expect(fs.existsSync(p!)).toBe(true);
  });

  it("rejects ../ traversal", () => {
    expect(resolveStaticPath(root, "/../secret.txt")).toBeNull();
    expect(resolveStaticPath(root, "/assets/../../secret.txt")).toBeNull();
  });

  it("rejects percent-encoded traversal", () => {
    expect(resolveStaticPath(root, "/%2e%2e/secret.txt")).toBeNull();
    expect(resolveStaticPath(root, "/assets/%2e%2e%2f%2e%2e%2fsecret.txt")).toBeNull();
    expect(resolveStaticPath(root, "/..%2f..%2fsecret.txt")).toBeNull();
  });

  it("rejects backslash traversal on Windows-style input", () => {
    expect(resolveStaticPath(root, "/..\\..\\secret.txt")).toBeNull();
    expect(resolveStaticPath(root, "\\\\..\\secret.txt")).toBeNull();
  });

  it("rejects absolute and drive-letter paths", () => {
    // After leading-slash stripping these become relative lookups inside
    // root — they must not resolve outside.
    const p = resolveStaticPath(root, "/C:/Windows/system.ini");
    expect(p === null || isInside(root, p!)).toBe(true);
    const p2 = resolveStaticPath(root, "/%43:/Windows/win.ini");
    expect(p2 === null || isInside(root, p2!)).toBe(true);
  });

  it("rejects null bytes and malformed escapes", () => {
    expect(resolveStaticPath(root, "/assets/app.js%00.png")).toBeNull();
    expect(resolveStaticPath(root, "/%E0%A4%A")).toBeNull();
  });

  it("blocks symlink escape when symlinks can be created", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "frost-outside-"));
    fs.writeFileSync(path.join(outside, "secret.txt"), "top secret");
    const linkPath = path.join(root, "escape");
    try {
      fs.symlinkSync(outside, linkPath, "junction");
    } catch {
      fs.rmSync(outside, { recursive: true, force: true });
      return; // no symlink privilege on this machine — skip
    }
    const resolved = resolveStaticPath(root, "/escape/secret.txt");
    expect(resolved).toBeNull();
    fs.rmSync(linkPath, { force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
});

function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
