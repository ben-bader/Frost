import { describe, it, expect } from "vitest";
import { createRequestHandler } from "../handler.js";
import { resolveConfig } from "@frostjs/core";
import type { DiscoveredRoute } from "@frostjs/router";
import type { RouteModule, ApiRouteModule } from "@frostjs/core";

function page(id: string, pattern: string, filePath: string): DiscoveredRoute {
  return { id, pattern, filePath, kind: "page", isDynamic: false, isCatchAll: false, score: 100 };
}

function api(id: string, pattern: string, filePath: string): DiscoveredRoute {
  return { id, pattern, filePath, kind: "api", isDynamic: false, isCatchAll: false, score: 100 };
}

const pageModule: RouteModule = {
  default: () => <main>ok</main>,
  loader: async () => ({ hello: "world" }),
};

const apiModule: ApiRouteModule = {
  GET: () => new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } }),
  POST: () => new Response("created", { status: 201 }),
};

function makeHandler(extra?: Partial<Parameters<typeof createRequestHandler>[0]>) {
  const modules = new Map<string, RouteModule | ApiRouteModule>([
    ["/virtual/page.tsx", pageModule],
    ["/virtual/api.ts", apiModule],
  ]);
  return createRequestHandler({
    routes: [page("page.tsx", "/", "/virtual/page.tsx"), api("api.ts", "/api/x", "/virtual/api.ts")],
    loadModule: async (r) => modules.get(r.filePath)!,
    security: resolveConfig().security,
    ...extra,
  });
}

describe("Request hardening", () => {
  it("decodes percent-encoded path characters before matching", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/%70layground"));
    // No /playground route in this fixture — but it must not 500; decode
    // happens, then normal 404 applies.
    expect([404, 200]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("matches an encoded route segment", async () => {
    const encRoute = page("p.tsx", "/hello", "/virtual/hello.tsx");
    const modules = new Map([["/virtual/hello.tsx", pageModule]]);
    const handler = createRequestHandler({
      routes: [encRoute],
      loadModule: async (r) => modules.get(r.filePath)!,
      security: resolveConfig().security,
    });
    const res = await handler(new Request("http://localhost/%68ello"));
    expect(res.status).toBe(200);
  });

  it("keeps %2F inside a single segment (no route-structure change)", async () => {
    const dyn: DiscoveredRoute = {
      id: "u/[...rest]/page.tsx", pattern: "/u/*rest", filePath: "/virtual/catch.tsx",
      kind: "page", isDynamic: true, isCatchAll: true, score: 1,
    };
    const seen: string[] = [];
    const mod: RouteModule = {
      default: () => null,
      loader: async ({ params }: any) => { seen.push(params.rest); return {}; },
    };
    const handler = createRequestHandler({
      routes: [dyn],
      loadModule: async () => mod,
      security: resolveConfig().security,
    });
    const res = await handler(new Request("http://localhost/u/a%2Fb/c"));
    expect(res.status).toBe(200);
    expect(seen[0]).toBe("a/b/c");
  });

  it("returns 400 for malformed percent-encoding", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/%E0%A4%A"));
    expect(res.status).toBe(400);
  });

  it("returns 405 with Allow for unsupported methods on page routes", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/", { method: "DELETE" }));
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("OPTIONS on a page route returns 405", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/", { method: "OPTIONS" }));
    expect(res.status).toBe(405);
  });

  it("POST to a page with an action runs the action", async () => {
    const withAction: RouteModule = {
      ...pageModule,
      action: async () => ({ ok: true }),
    };
    const modules = new Map([["/virtual/page.tsx", withAction]]);
    const handler = createRequestHandler({
      routes: [page("page.tsx", "/", "/virtual/page.tsx")],
      loadModule: async (r) => modules.get(r.filePath)!,
      security: resolveConfig().security,
    });
    const res = await handler(new Request("http://localhost/", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("auto-answers OPTIONS on API routes with 204 + Allow", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/api/x", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Allow")).toContain("GET");
    expect(res.headers.get("Allow")).toContain("POST");
  });

  it("auto-answers HEAD on API routes via GET with no body", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/api/x", { method: "HEAD" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("emits a report-only CSP with a per-request nonce by default", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/"));
    const csp = res.headers.get("Content-Security-Policy-Report-Only");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/nonce-[A-Za-z0-9_-]+/);
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
    // nonce is embedded in the hydration data for inline scripts
    const body = await res.text();
    expect(body).toContain('"cspNonce"');
  });

  it("enforce mode emits Content-Security-Policy instead", async () => {
    const security = resolveConfig({ security: { cspMode: "enforce" } }).security;
    const handler = makeHandler({ security });
    const res = await handler(new Request("http://localhost/"));
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
    expect(res.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
  });

  it("security.csp=false disables CSP", async () => {
    const security = resolveConfig({ security: { csp: false } }).security;
    const handler = makeHandler({ security });
    const res = await handler(new Request("http://localhost/"));
    expect(res.headers.get("Content-Security-Policy")).toBeNull();
    expect(res.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
  });

  it("applies a route headers export and no-cache on HTML", async () => {
    const withHeaders: RouteModule = {
      ...pageModule,
      headers: { "X-Custom": "yes", "Cache-Control": "public, max-age=60" },
    };
    const modules = new Map([["/virtual/page.tsx", withHeaders]]);
    const handler = createRequestHandler({
      routes: [page("page.tsx", "/", "/virtual/page.tsx")],
      loadModule: async (r) => modules.get(r.filePath)!,
      security: resolveConfig().security,
    });
    const res = await handler(new Request("http://localhost/"));
    expect(res.headers.get("X-Custom")).toBe("yes");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("defaults HTML responses to no-cache", async () => {
    const handler = makeHandler();
    const res = await handler(new Request("http://localhost/"));
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("supports a function headers export", async () => {
    const withHeaders: RouteModule = {
      ...pageModule,
      headers: async ({ params }: any) => ({ "X-Params": JSON.stringify(params) }),
    };
    const modules = new Map([["/virtual/page.tsx", withHeaders]]);
    const handler = createRequestHandler({
      routes: [page("page.tsx", "/", "/virtual/page.tsx")],
      loadModule: async (r) => modules.get(r.filePath)!,
      security: resolveConfig().security,
    });
    const res = await handler(new Request("http://localhost/"));
    expect(res.headers.get("X-Params")).toBe("{}");
  });

  it("HSTS is opt-in", async () => {
    const security = resolveConfig({ security: { hsts: true } }).security;
    const handler = makeHandler({ security });
    const res = await handler(new Request("http://localhost/"));
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });
});
