import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { loadEnvFiles, missingEnvVars } from "../env.js";

describe("loadEnvFiles", () => {
  let dir: string;
  const saved: Record<string, string | undefined> = {};
  const KEYS = ["FROST_TEST_A", "FROST_TEST_B", "FROST_TEST_C", "FROST_TEST_D"];

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "frost-env-"));
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(async () => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("loads .env with quotes, comments, and export prefix", async () => {
    await fs.writeFile(
      path.join(dir, ".env"),
      [
        "# comment",
        "FROST_TEST_A=plain",
        'FROST_TEST_B="quoted value"',
        "export FROST_TEST_C='single' # trailing",
        "",
        "not a valid line",
      ].join("\n"),
    );
    const res = await loadEnvFiles(dir, "test");
    expect(process.env.FROST_TEST_A).toBe("plain");
    expect(process.env.FROST_TEST_B).toBe("quoted value");
    expect(process.env.FROST_TEST_C).toBe("single");
    expect(res.files).toHaveLength(1);
  });

  it("mode files override base .env but never real env", async () => {
    await fs.writeFile(path.join(dir, ".env"), "FROST_TEST_A=base\nFROST_TEST_B=base\n");
    await fs.writeFile(path.join(dir, ".env.production"), "FROST_TEST_A=prod\n");
    process.env.FROST_TEST_B = "real-env";
    await loadEnvFiles(dir, "production");
    expect(process.env.FROST_TEST_A).toBe("prod");
    expect(process.env.FROST_TEST_B).toBe("real-env");
  });

  it("missing files are skipped silently", async () => {
    const res = await loadEnvFiles(dir, "development");
    expect(res.files).toHaveLength(0);
    expect(res.loaded).toEqual({});
  });
});

describe("missingEnvVars", () => {
  it("reports only unset or empty required vars", () => {
    process.env.FROST_REQ_SET = "x";
    process.env.FROST_REQ_EMPTY = "";
    const missing = missingEnvVars(["FROST_REQ_SET", "FROST_REQ_EMPTY", "FROST_REQ_NONE"]);
    expect(missing).toEqual(["FROST_REQ_EMPTY", "FROST_REQ_NONE"]);
    delete process.env.FROST_REQ_SET;
    delete process.env.FROST_REQ_EMPTY;
  });
});
