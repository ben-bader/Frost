import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const SRC = path.resolve(__dirname, "..");
const APP = path.join(SRC, "app");

function readRoute(...segments: string[]): string {
  return fs.readFileSync(path.join(APP, ...segments), "utf-8");
}

async function discoverRoutes(dir: string, prefix = ""): Promise<string[]> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...(await discoverRoutes(full, `${prefix}/${entry.name}`)));
    } else if (entry.name === "page.tsx") {
      routes.push(prefix === "" ? "/" : prefix);
    }
  }
  return routes.sort();
}

describe("starter routes", () => {
  it("discovers the demo, playground, and hello routes", async () => {
    const routes = await discoverRoutes(APP);
    expect(routes).toEqual(["/", "/hello/[name]", "/playground"]);
  });

  it("home page renders the hero with Frost headline", () => {
    const src = readRoute("page.tsx");
    expect(src).toContain("React rendering. Web-native runtime.");
    expect(src).toContain("Frost framework.");
    expect(src).toContain("Open playground");
    expect(src).toContain("Run it locally");
  });

  it("playground page wires the bento tiles", () => {
    const src = readRoute("playground", "page.tsx");
    expect(src).toContain("CounterTile");
    expect(src).toContain("TerminalTile");
    expect(src).toContain("BrowserTile");
    expect(src).toContain("runId");
  });

  it("error demo renders terminal and dialog from typed data", () => {
    const data = fs.readFileSync(path.join(SRC, "data", "playgroundError.ts"), "utf-8");
    const terminal = fs.readFileSync(
      path.join(SRC, "components", "bento", "TerminalTile.tsx"),
      "utf-8",
    );
    const browser = fs.readFileSync(
      path.join(SRC, "components", "bento", "BrowserTile.tsx"),
      "utf-8",
    );
    expect(data).toContain("PLAYGROUND_ERROR");
    expect(data).toContain("HydrationError");
    expect(terminal).toContain("PLAYGROUND_ERROR");
    expect(browser).toContain("PLAYGROUND_ERROR");
    expect(browser).toContain('role="alertdialog"');
  });
});
