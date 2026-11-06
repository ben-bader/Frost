import { describe, it, expect } from "vitest";
import { createRequestHandler } from "../handler.js";
import { json } from "../response.js";
import type { DiscoveredRoute } from "@frostjs/router";
import type { RouteModule, ApiRouteModule } from "@frostjs/core";

describe("Server request handling and SSR", () => {
  const routes: DiscoveredRoute[] = [
    {
      id: "api/health.ts",
      pattern: "/api/health",
      filePath: "/virtual/api/health.ts",
      kind: "api",
      isDynamic: false,
      isCatchAll: false,
      score: 150,
    },
    {
      id: "page.tsx",
      pattern: "/",
      filePath: "/virtual/page.tsx",
      kind: "page",
      isDynamic: false,
      isCatchAll: false,
      score: 100,
    },
  ];

  const modules: Record<string, RouteModule | ApiRouteModule> = {
    "/virtual/api/health.ts": {
      GET: () => json({ status: "healthy", framework: "frost" }),
    },
    "/virtual/page.tsx": {
      loader: async () => ({ title: "Welcome to Frost", counter: 42 }),
      metadata: { title: "Frost Homepage" },
      default: ({ data }: any) => {
        return (
          <main>
            <h1>{data.title}</h1>
            <p>Counter: {data.counter}</p>
          </main>
        );
      },
    },
  };

  const handler = createRequestHandler({
    routes,
    loadModule: async (r) => modules[r.filePath]!,
  });

  it("handles API endpoint GET requests", async () => {
    const req = new Request("http://localhost:3000/api/health", { method: "GET" });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const data = await res.json();
    expect(data).toEqual({ status: "healthy", framework: "frost" });
  });

  it("returns 405 Method Not Allowed for unsupported methods on API routes", async () => {
    const req = new Request("http://localhost:3000/api/health", { method: "POST" });
    const res = await handler(req);

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data.error).toContain("Method POST Not Allowed");
  });

  it("renders React SSR page with loader data and client state injection", async () => {
    const req = new Request("http://localhost:3000/", { method: "GET" });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Frost Homepage</title>");
    expect(html).toContain("<h1>Welcome to Frost</h1>");
    expect(html).toContain("Counter:");
    expect(html).toContain("42");
    expect(html).toContain('id="__FROST_DATA__"');
    expect(html).toContain('"loaderData":{"title":"Welcome to Frost","counter":42}');
  });

  it("returns 404 for unmatched routes", async () => {
    const req = new Request("http://localhost:3000/non-existent", { method: "GET" });
    const res = await handler(req);

    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain("404 Not Found");
  });
});
