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
  it("discovers exactly two pages", async () => {
    const routes = await discoverRoutes(APP);
    expect(routes).toEqual(["/", "/playground"]);
  });

  it("home page renders the hero with Frost headline", () => {
    const src = readRoute("page.tsx");
    expect(src).toContain("React rendering. Web-native runtime.");
    expect(src).toContain("Frost framework.");
    expect(src).toContain("Open playground");
    expect(src).toContain("Run it locally");
  });

  it("playground page wires counter and error dialog", () => {
    const src = readRoute("playground", "page.tsx");
    expect(src).toContain("Counter");
    expect(src).toContain("ErrorDialog");
    expect(src).toContain("View error logs");
    expect(src).toContain("setTimeout");
  });

  it("error dialog uses native dialog with demo log lines", () => {
    const src = fs.readFileSync(path.join(SRC, "components", "ErrorDialog.tsx"), "utf-8");
    expect(src).toContain("<dialog");
    expect(src).toContain("Errors detected");
    expect(src).toContain("hydration mismatch");
    expect(src).toContain("route contract missing field");
  });
});
