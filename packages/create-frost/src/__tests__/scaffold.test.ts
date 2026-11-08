import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scaffold, TEMPLATES } from "../scaffold.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "create-frost-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("scaffold", () => {
  it("creates a minimal app with expected files", () => {
    const target = path.join(tmp, "demo-app");
    const result = scaffold({ targetDir: target, template: "minimal", appName: "demo-app" });
    expect(result.files).toContain("src/app/page.tsx");
    expect(result.files).toContain("src/app/layout.tsx");
    expect(result.files).toContain("src/api/hello/route.ts");
    expect(result.files).toContain("frost.config.ts");
    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
    expect(pkg.name).toBe("demo-app");
    expect(pkg.scripts.dev).toBe("frost dev");
  });

  it("creates a tailwind app with postcss config and css", () => {
    const target = path.join(tmp, "tw-app");
    const result = scaffold({ targetDir: target, template: "tailwind" });
    expect(result.files).toContain("postcss.config.mjs");
    expect(result.files).toContain("src/styles/app.css");
    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
    expect(pkg.dependencies.tailwindcss).toBeDefined();
  });

  it("defaults to the minimal template", () => {
    const result = scaffold({ targetDir: path.join(tmp, "plain") });
    expect(result.template).toBe("minimal");
  });

  it("rejects a non-empty target directory", () => {
    const target = path.join(tmp, "occupied");
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "file.txt"), "x");
    expect(() => scaffold({ targetDir: target })).toThrow(/not empty/);
  });

  it("rejects an unknown template", () => {
    expect(() =>
      scaffold({ targetDir: path.join(tmp, "x"), template: "nope" as never })
    ).toThrow(/Unknown template/);
  });

  it("exposes both templates", () => {
    expect(TEMPLATES).toEqual(["minimal", "tailwind"]);
  });
});
