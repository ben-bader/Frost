import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { discoverRoutes } from "@frostjs/router";
import { createRequestHandler } from "@frostjs/server";
import * as PageModule from "../app/page.js";
import * as ExamplesModule from "../app/examples/page.js";
import * as PlaygroundModule from "../app/playground/page.js";
import * as ApiHealthModule from "../api/health.js";
import * as LayoutModule from "../app/layout.js";

const modulesByPattern: Record<string, unknown> = {
  "/": PageModule,
  "/examples": ExamplesModule,
  "/playground": PlaygroundModule,
  "/api/health": ApiHealthModule,
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

describe("Starter Application Playground Suite", () => {
  const rootDir = path.resolve(__dirname, "../..");

  it("discovers the three page routes and API routes", () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });

    const patterns = routes.map((r) => r.pattern).sort();
    expect(patterns).toEqual([
      "/",
      "/api/echo",
      "/api/health",
      "/api/records",
      "/examples",
      "/playground",
    ]);
  });

  it("renders the Overview page with loader data and hydration payload", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });
    const handler = createHandler(routes);

    const response = await handler(new Request("http://localhost:3000/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Frost — React full-stack framework</title>");
    expect(html).toContain("Server-rendered React");
    expect(html).toContain('id="__FROST_DATA__"');
  });

  it("renders the Examples page", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });
    const handler = createHandler(routes);

    const response = await handler(new Request("http://localhost:3000/examples"));

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Runtime behaviors, running live.");
    expect(html).toContain("Loader output");
  });

  it("renders the Playground page", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });
    const handler = createHandler(routes);

    const response = await handler(new Request("http://localhost:3000/playground"));

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Poke the runtime.");
    expect(html).toContain("Trigger render error");
  });

  it("dispatches requests to the /api/health endpoint", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });
    const handler = createHandler(routes);

    const response = await handler(new Request("http://localhost:3000/api/health", { method: "GET" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data.framework).toBe("Frost");
    expect(data.requestId).toBeDefined();
    expect(data.memory).toBeDefined();
  });
});
