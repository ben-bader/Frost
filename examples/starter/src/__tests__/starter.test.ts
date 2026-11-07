import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { discoverRoutes } from "@frostjs/router";
import { createRequestHandler } from "@frostjs/server";
import * as PageModule from "../app/page.js";
import * as PlaygroundModule from "../app/playground/page.js";
import * as LayoutModule from "../app/layout.js";

const modulesByPattern: Record<string, unknown> = {
  "/": PageModule,
  "/playground": PlaygroundModule,
};

function createHandler(routes: ReturnType<typeof discoverRoutes>) {
  return createRequestHandler({
    routes,
    loadModule: async (r) => {
      if (r.kind === "layout") return LayoutModule;
      const mod = modulesByPattern[r.pattern];
      if (mod) return mod;
      throw new Error(`Unknown route: ${r.filePath}`);
    },
  });
}

const rootDir = path.resolve(__dirname, "../..");

function discover() {
  return discoverRoutes({
    appDirectory: "src/app",
    apiDirectory: "src/api",
    rootDir,
  });
}

describe("Frost starter kit", () => {
  it("discovers exactly the demo and playground pages", () => {
    const routes = discover();
    expect(routes.map((r) => r.pattern).sort()).toEqual(["/", "/playground"]);
  });

  it("renders the demo page with loader data and hydration payload", async () => {
    const handler = createHandler(discover());
    const response = await handler(new Request("http://localhost:3000/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Frost — React rendering, web-native runtime</title>");
    expect(html).toContain("React rendering. Web-native runtime.");
    expect(html).toContain('id="__FROST_DATA__"');
  });

  it("renders the playground with default loader data", async () => {
    const handler = createHandler(discover());
    const response = await handler(new Request("http://localhost:3000/playground"));

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Send a request. Watch it render.");
    expect(html).toContain('action="/playground"');
    expect(html).toContain("loader resolved in");
    expect(html).toContain('"name":"world"');
  });

  it("runs the playground loader with form params", async () => {
    const handler = createHandler(discover());
    const response = await handler(
      new Request("http://localhost:3000/playground?name=Frost&delay=0")
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('"name":"Frost"');
    expect(html).toContain("GET /playground?name=Frost&amp;delay=0");
  });
});
