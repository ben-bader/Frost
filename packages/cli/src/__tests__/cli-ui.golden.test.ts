import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { configureUi, stripAnsi } from "@frost.js/core/cli-ui";
import { cliHeader } from "../ui.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "..", "..", "test", "golden");

/**
 * Renders FRAME 2 (dev) with fixed fake data — golden fixture only.
 */
function renderFrame2Dev(): string {
  return cliHeader({
    version: "0.1.1",
    appName: "my-app",
    rows: {
      local: "http://localhost:3000/",
      network: "http://192.168.1.20:3000/",
      pages: 3,
      api: 1,
      envFiles: [".env", ".env.local"],
      watching: true,
    },
    readyMs: 1234,
  }).join("\n");
}

describe("FRAME 2 golden", () => {
  beforeAll(() => {
    configureUi({
      color: "none",
      unicode: true,
      emoji: true,
      columns: 100,
      narrow: false,
      interactive: false,
    });
  });

  it("dev header matches golden (ANSI stripped)", () => {
    const expected = fs.readFileSync(path.join(GOLDEN_DIR, "frame2-dev.txt"), "utf8");
    expect(stripAnsi(renderFrame2Dev())).toBe(expected);
  });

  it("omits rows without real values", () => {
    const out = cliHeader({ version: "0.1.1", appName: "my-app" });
    const plain = stripAnsi(out.join("\n"));
    expect(plain).not.toContain("Local");
    expect(plain).not.toContain("Network");
    expect(plain).not.toContain("Routes");
    expect(plain).not.toContain("Env");
    expect(plain).not.toContain("Watching");
    expect(plain).not.toContain("Ready in");
  });
});
