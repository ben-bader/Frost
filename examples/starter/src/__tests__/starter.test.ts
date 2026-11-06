import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { discoverRoutes } from "@frostjs/router";
import { createRequestHandler } from "@frostjs/server";
import * as PageModule from "../app/page.js";
import * as ApiHealthModule from "../api/health.js";

describe("Starter Application Vertical Slice", () => {
  const rootDir = path.resolve(__dirname, "../..");

  it("discovers app page routes and api endpoints", () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });

    const pageRoute = routes.find((r) => r.pattern === "/");
    const apiRoute = routes.find((r) => r.pattern === "/api/health");

    expect(pageRoute).toBeDefined();
    expect(pageRoute?.kind).toBe("page");

    expect(apiRoute).toBeDefined();
    expect(apiRoute?.kind).toBe("api");
  });

  it("executes the server loader and renders SSR HTML with hydration payload", async () => {
    const routes = discoverRoutes({
      appDirectory: "src/app",
      apiDirectory: "src/api",
      rootDir,
    });

    const handler = createRequestHandler({
      routes,
      loadModule: async (r) => {
        if (r.kind === "page") return PageModule;
        if (r.kind === "api") return ApiHealthModule;
        throw new Error(`Unknown route: ${r.filePath}`);
      },
    });

    const request = new Request("http://localhost:3000/");
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Frost Starter Application</title>");
    expect(html).toContain("Frost Framework — Minimal Vertical Slice");
    expect(html).toContain("Server-Side Rendered Metrics");
    expect(html).toContain("Interactive Client Counter");
    expect(html).toContain('id="__FROST_DATA__"');
    expect(html).toContain('"environment":');
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
  });
});
