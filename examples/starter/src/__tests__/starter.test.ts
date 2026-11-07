import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { discoverRoutes } from "@frostjs/router";
import { createRequestHandler } from "@frostjs/server";
import * as PageModule from "../app/page.js";
import * as ApiHealthModule from "../api/health.js";
import * as SsrPageModule from "../app/examples/ssr/page.js";
import * as LayoutModule from "../app/layout.js";

describe("Starter Application Playground Suite", () => {
  const rootDir = path.resolve(__dirname, "../..");

  it("discovers all 8 playground routes and api endpoints", () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });

    expect(routes.length).toBe(8);

    const patterns = routes.map((r) => r.pattern);
    expect(patterns).toContain("/");
    expect(patterns).toContain("/examples/ssr");
    expect(patterns).toContain("/examples/hydration");
    expect(patterns).toContain("/examples/counter");
    expect(patterns).toContain("/examples/api");
    expect(patterns).toContain("/examples/boundaries");
    expect(patterns).toContain("/api/health");
    expect(patterns).toContain("/api/echo");
  });

  it("executes the server loader and renders Overview page with layout and hydration payload", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });

    const handler = createRequestHandler({
      routes,
      loadModule: async (r) => {
        if (r.kind === "layout") return LayoutModule;
        if (r.pattern === "/") return PageModule;
        if (r.pattern === "/api/health") return ApiHealthModule;
        throw new Error(`Unknown route: ${r.filePath}`);
      },
    });

    const request = new Request("http://localhost:3000/");
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Frost Framework — Developer Playground</title>");
    expect(html).toContain("Welcome to Frost");
    expect(html).toContain("Live Server Telemetry");
    expect(html).toContain("Core Architectural Promises");
    expect(html).toContain('id="__FROST_DATA__"');
  });

  it("renders the SSR demonstration route with server timestamp and node version", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });

    const handler = createRequestHandler({
      routes,
      loadModule: async (r) => {
        if (r.kind === "layout") return LayoutModule;
        if (r.pattern === "/examples/ssr") return SsrPageModule;
        return PageModule;
      },
    });

    const request = new Request("http://localhost:3000/examples/ssr");
    const response = await handler(request);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Server-Side Rendering (SSR) Demonstration");
    expect(html).toContain("Server Execution Context");
    expect(html).toContain("SSR Verification Check");
  });

  it("dispatches requests to the /api/health endpoint", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });

    const handler = createRequestHandler({
      routes,
      loadModule: async (r) => {
        if (r.kind === "api") return ApiHealthModule;
        return PageModule;
      },
    });

    const request = new Request("http://localhost:3000/api/health", { method: "GET" });
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data.framework).toBe("Frost");
    expect(data.requestId).toBeDefined();
    expect(data.memory).toBeDefined();
  });
});
