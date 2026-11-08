import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadFrostConfig, mergeCliOverrides } from "../config.js";

describe("loadFrostConfig", () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "frost-config-"));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns an empty config when no file exists", async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "frost-empty-"));
    try {
      expect(await loadFrostConfig({ rootDir: empty })).toEqual({});
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

  it("loads frost.config.ts with real values", async () => {
    fs.writeFileSync(
      path.join(dir, "frost.config.ts"),
      `export default {
        appDirectory: "src/pages",
        apiDirectory: "src/endpoints",
        publicDirectory: "assets",
        server: { port: 4321, host: "0.0.0.0" },
      };`,
    );
    const config = await loadFrostConfig({ rootDir: dir });
    expect(config.appDirectory).toBe("src/pages");
    expect(config.apiDirectory).toBe("src/endpoints");
    expect(config.publicDirectory).toBe("assets");
    expect(config.server?.port).toBe(4321);
    expect(config.server?.host).toBe("0.0.0.0");
  });

  it("loads frost.config.mjs when .ts is absent", async () => {
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "frost-config-mjs-"));
    try {
      fs.writeFileSync(
        path.join(dir2, "frost.config.mjs"),
        `export default { server: { port: 5555 } };`,
      );
      const config = await loadFrostConfig({ rootDir: dir2 });
      expect(config.server?.port).toBe(5555);
    } finally {
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });

  it("honors an explicit --config path", async () => {
    const custom = path.join(dir, "custom.config.ts");
    fs.writeFileSync(custom, `export default { appDirectory: "custom/app" };`);
    const config = await loadFrostConfig({ rootDir: dir, configPath: "custom.config.ts" });
    expect(config.appDirectory).toBe("custom/app");
  });

  it("fails with the file path on a syntax error", async () => {
    const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), "frost-config-bad-"));
    try {
      fs.writeFileSync(path.join(dir3, "frost.config.ts"), `export default { !!! }`);
      await expect(loadFrostConfig({ rootDir: dir3 })).rejects.toThrow(/frost\.config\.ts/);
    } finally {
      fs.rmSync(dir3, { recursive: true, force: true });
    }
  });

  it("fails clearly when --config points at a missing file", async () => {
    await expect(loadFrostConfig({ rootDir: dir, configPath: "nope.config.ts" })).rejects.toThrow(
      /not found/,
    );
  });
});

describe("mergeCliOverrides", () => {
  it("CLI port/host flags win over the config file", () => {
    const merged = mergeCliOverrides(
      { server: { port: 1111, host: "a" }, appDirectory: "x" },
      { port: 2222 },
    );
    expect(merged.server?.port).toBe(2222);
    expect(merged.server?.host).toBe("a");
    expect(merged.appDirectory).toBe("x");
  });
});
