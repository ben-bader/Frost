import { describe, it, expect } from "vitest";
import { createRequestHandler } from "../handler.js";
import { resolveConfig } from "@frost.js/core";
import type { DiscoveredRoute } from "@frost.js/router";
import type { RouteModule } from "@frost.js/core";

function page(
  id: string,
  pattern: string,
  filePath: string,
  extra: Partial<DiscoveredRoute> = {},
): DiscoveredRoute {
  return {
    id,
    pattern,
    filePath,
    kind: "page",
    isDynamic: false,
    isCatchAll: false,
    score: 100,
    ...extra,
  };
}

const security = resolveConfig().security;

function handlerFor(routes: DiscoveredRoute[], modules: Record<string, RouteModule>) {
  return createRequestHandler({
    routes,
    loadModule: async (r) => modules[r.filePath] as RouteModule,
    security,
    lang: "en",
  });
}

const get = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init);

describe("F3: layout loaders and metadata", () => {
  it("runs layout loaders in parallel and passes each layout its own data", async () => {
    const calls: string[] = [];
    const layout: RouteModule = {
      default: ({ data, children }: any) => (
        <div data-testid="layout" data-layout-data={JSON.stringify(data)}>
          {children}
        </div>
      ),
      loader: async () => {
        calls.push("layout");
        await new Promise((r) => setTimeout(r, 5));
        return { from: "layout" };
      },
    };
    const route: RouteModule = {
      default: ({ data }: any) => <p>{data?.from}</p>,
      loader: async () => {
        calls.push("route");
        return { from: "route" };
      },
    };
    const layoutPath = "/virtual/layout.tsx";
    const handler = handlerFor(
      [page("page.tsx", "/", "/virtual/page.tsx", { layouts: [layoutPath] })],
      { "/virtual/page.tsx": route, [layoutPath]: layout },
    );
    const res = await handler(get("/"));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(calls.sort()).toEqual(["layout", "route"]);
    // Layout received its own loader data, page received route data.
    expect(html).toContain("layout-data");
    expect(html).toContain("from&quot;:&quot;layout&quot;");
    expect(html).toContain("route");
    // Serialized client state carries per-layout data for hydration.
    expect(html).toContain("layoutData");
  });

  it("merges metadata parent->child with title templates", async () => {
    const layout: RouteModule = {
      default: ({ children }: any) => <div>{children}</div>,
      metadata: { titleTemplate: "%s | Acme", description: "layout desc" },
    };
    const route: RouteModule = {
      default: () => <p>x</p>,
      metadata: { title: "Home", robots: "index,follow" },
    };
    const layoutPath = "/virtual/layout.tsx";
    const handler = handlerFor(
      [page("page.tsx", "/", "/virtual/page.tsx", { layouts: [layoutPath] })],
      { "/virtual/page.tsx": route, [layoutPath]: layout },
    );
    const res = await handler(get("/"));
    const html = await res.text();
    expect(html).toContain("<title>Home | Acme</title>");
    expect(html).toContain('name="robots" content="index,follow"');
    expect(html).toContain('name="description" content="layout desc"');
  });

  it("falls back to a layout action when the page has none", async () => {
    const layout: RouteModule = {
      default: ({ children }: any) => <div>{children}</div>,
      action: async () => ({ handledBy: "layout" }),
    };
    const route: RouteModule = { default: () => <p>x</p> };
    const layoutPath = "/virtual/layout.tsx";
    const handler = handlerFor(
      [page("page.tsx", "/", "/virtual/page.tsx", { layouts: [layoutPath] })],
      { "/virtual/page.tsx": route, [layoutPath]: layout },
    );
    const res = await handler(
      get("/", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ handledBy: "layout" });
  });
});

describe("Progressive enhancement / actions", () => {
  it("re-renders the page with actionData for form posts (Accept: text/html)", async () => {
    const route: RouteModule = {
      default: ({ actionData }: any) => <p>result:{String(actionData?.msg)}</p>,
      action: async () => ({ msg: "saved" }),
    };
    const handler = handlerFor([page("page.tsx", "/form", "/virtual/form.tsx")], {
      "/virtual/form.tsx": route,
    });
    const res = await handler(
      get("/form", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "text/html",
        },
        body: "field=value",
      }),
    );
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(html).toMatch(/result:.*saved/);
    expect(html).toContain("actionData");
  });

  it("returns JSON for non-HTML action clients", async () => {
    const route: RouteModule = {
      default: () => <p>x</p>,
      action: async () => ({ ok: 1 }),
    };
    const handler = handlerFor([page("page.tsx", "/form", "/virtual/form.tsx")], {
      "/virtual/form.tsx": route,
    });
    const res = await handler(
      get("/form", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      }),
    );
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ ok: 1 });
  });

  it("rejects cross-origin form posts with 403 (CSRF)", async () => {
    const route: RouteModule = {
      default: () => <p>x</p>,
      action: async () => ({ ok: 1 }),
    };
    const handler = handlerFor([page("page.tsx", "/form", "/virtual/form.tsx")], {
      "/virtual/form.tsx": route,
    });
    const res = await handler(
      get("/form", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://evil.example",
          host: "localhost",
        },
        body: "a=b",
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe("Error and not-found routes", () => {
  it("renders the nearest error boundary inside layouts on loader failure", async () => {
    const boundary: RouteModule = {
      default: ({ error }: any) => <div className="boundary">ERR:{error.message}</div>,
    };
    const layout: RouteModule = {
      default: ({ children }: any) => <div className="lyt">{children}</div>,
    };
    const route: RouteModule = {
      default: () => <p>never</p>,
      loader: async () => {
        throw new Error("loader kaboom");
      },
    };
    const boundaryPath = "/virtual/error.tsx";
    const layoutPath = "/virtual/layout.tsx";
    const handler = handlerFor(
      [
        page("page.tsx", "/boom", "/virtual/boom.tsx", {
          layouts: [layoutPath],
          errorBoundary: boundaryPath,
        }),
      ],
      {
        "/virtual/boom.tsx": route,
        [layoutPath]: layout,
        [boundaryPath]: boundary,
      },
    );
    const res = await handler(get("/boom"));
    const html = await res.text();
    expect(res.status).toBe(500);
    expect(html).toContain("boundary");
    expect(html).toContain("loader kaboom");
    expect(html).toContain("lyt"); // rendered inside the layout
  });

  it("renders the error boundary when the component throws", async () => {
    const boundary: RouteModule = {
      default: ({ error }: any) => <div>caught:{error.message}</div>,
    };
    const route: RouteModule = {
      default: () => {
        throw new Error("render kaboom");
      },
    };
    const handler = handlerFor(
      [
        page("page.tsx", "/r", "/virtual/r.tsx", {
          errorBoundary: "/virtual/error.tsx",
        }),
      ],
      { "/virtual/r.tsx": route, "/virtual/error.tsx": boundary },
    );
    const res = await handler(get("/r"));
    const html = await res.text();
    expect(res.status).toBe(500);
    expect(html).toMatch(/caught:.*render kaboom/);
  });

  it("falls back to a styled FrostDocument 500 without an error boundary", async () => {
    const route: RouteModule = {
      default: () => <p>x</p>,
      loader: async () => {
        throw new Error("no boundary");
      },
    };
    const handler = handlerFor([page("page.tsx", "/x", "/virtual/x.tsx")], {
      "/virtual/x.tsx": route,
    });
    const res = await handler(get("/x"));
    const html = await res.text();
    expect(res.status).toBe(500);
    expect(html).toContain("__FROST_DATA__");
    expect(html).toContain("Something went wrong");
  });

  it("renders app not-found inside the root layout with status 404", async () => {
    const layout: RouteModule = {
      default: ({ children }: any) => <div className="root-lyt">{children}</div>,
    };
    const nf: RouteModule = {
      default: () => <h1>Custom 404</h1>,
    };
    const layoutPath = "/virtual/layout.tsx";
    const routes: DiscoveredRoute[] = [
      page("page.tsx", "/", "/virtual/page.tsx", { layouts: [layoutPath] }),
      {
        id: "not-found",
        pattern: "",
        filePath: "/virtual/not-found.tsx",
        kind: "not-found",
        isDynamic: false,
        isCatchAll: false,
        score: -1,
        layouts: [layoutPath],
      },
    ];
    const handler = handlerFor(routes, {
      "/virtual/page.tsx": { default: () => <p>home</p> },
      [layoutPath]: layout,
      "/virtual/not-found.tsx": nf,
    });
    const res = await handler(get("/does-not-exist"));
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(html).toContain("Custom 404");
    expect(html).toContain("root-lyt");
  });

  it("renders a styled 404 when no not-found module exists", async () => {
    const handler = handlerFor([page("page.tsx", "/", "/virtual/page.tsx")], {
      "/virtual/page.tsx": { default: () => <p>home</p> },
    });
    const res = await handler(get("/missing"));
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(html).toContain("__FROST_DATA__");
    expect(html).toContain("404 Not Found");
  });
});

describe("SEO / head", () => {
  it("renders robots, twitter, and escaped JSON-LD", async () => {
    const route: RouteModule = {
      default: () => <p>x</p>,
      metadata: {
        title: "T",
        robots: "noindex",
        twitter: { card: "summary", title: "Tw" },
        jsonLd: { "@context": "https://schema.org", name: "</script><b>x</b>" },
      },
    };
    const handler = handlerFor([page("page.tsx", "/", "/virtual/page.tsx")], {
      "/virtual/page.tsx": route,
    });
    const res = await handler(get("/"));
    const html = await res.text();
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('name="twitter:card" content="summary"');
    expect(html).toContain("application/ld+json");
    // The payload's </script> must be escaped.
    expect(html).not.toContain("</script><b>x</b>");
    expect(html).toContain("<\\/script>");
  });

  it("emits og:title from the page title by default", async () => {
    const route: RouteModule = {
      default: () => <p>x</p>,
      metadata: { title: "Hello", openGraph: { type: "website" } },
    };
    const handler = handlerFor([page("page.tsx", "/", "/virtual/page.tsx")], {
      "/virtual/page.tsx": route,
    });
    const html = await (await handler(get("/"))).text();
    expect(html).toContain('property="og:title" content="Hello"');
    expect(html).toContain('property="og:type" content="website"');
  });
});

describe("Middleware", () => {
  const mwRoute = (id: string): DiscoveredRoute => ({
    id,
    pattern: "",
    filePath: "/virtual/_middleware.ts",
    kind: "middleware",
    isDynamic: false,
    isCatchAll: false,
    score: -1,
  });

  it("runs middleware before routing and can short-circuit with a Response", async () => {
    const order: string[] = [];
    const handler = handlerFor(
      [page("page.tsx", "/", "/virtual/page.tsx"), mwRoute("_middleware.ts")],
      {
        "/virtual/page.tsx": {
          default: () => {
            order.push("page");
            return <p>hi</p>;
          },
        },
        "/virtual/_middleware.ts": {
          middleware: async (_req, _ctx, next) => {
            order.push("middleware");
            const res = await next();
            if (res instanceof Response) {
              res.headers.set("x-mw", "yes");
            }
            return res;
          },
        },
      },
    );
    const res = await handler(get("/"));
    expect(order).toEqual(["middleware", "page"]);
    expect(res.headers.get("x-mw")).toBe("yes");
    expect(await res.text()).toContain("hi");
  });

  it("supports multiple middlewares in order and early return", async () => {
    const order: string[] = [];
    const handler = handlerFor(
      [page("page.tsx", "/", "/virtual/page.tsx"), mwRoute("_middleware.ts")],
      {
        "/virtual/page.tsx": { default: () => <p>page</p> },
        "/virtual/_middleware.ts": {
          middleware: [
            async () => {
              order.push("first");
              return new Response("blocked", { status: 401 });
            },
            async () => {
              order.push("second");
            },
          ],
        },
      },
    );
    const res = await handler(get("/"));
    expect(order).toEqual(["first"]);
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("blocked");
  });

  it("memoizes next() so undefined return does not re-run routing", async () => {
    let loaderCalls = 0;
    const handler = handlerFor(
      [page("page.tsx", "/", "/virtual/page.tsx"), mwRoute("_middleware.ts")],
      {
        "/virtual/page.tsx": {
          default: ({ data }: any) => <p>{String(data)}</p>,
          loader: () => {
            loaderCalls++;
            return "loaded";
          },
        },
        "/virtual/_middleware.ts": {
          middleware: async (_req, _ctx, next) => {
            const res = await next();
            if (res instanceof Response) {
              res.headers.set("x-mw-undefined", "yes");
            }
            // Intentionally returns undefined after calling next().
          },
        },
      },
    );
    const res = await handler(get("/"));
    expect(res.headers.get("x-mw-undefined")).toBe("yes");
    expect(await res.text()).toContain("loaded");
    expect(loaderCalls).toBe(1);
  });

  it("runs middleware for API routes too", async () => {
    const apiRoute: DiscoveredRoute = {
      id: "api/hello.ts",
      pattern: "api/hello",
      filePath: "/virtual/api/hello.ts",
      kind: "api",
      isDynamic: false,
      isCatchAll: false,
      score: 100,
    };
    let ran = false;
    const handler = handlerFor([apiRoute, mwRoute("_middleware.ts")], {
      "/virtual/api/hello.ts": {
        GET: () => Response.json({ ok: true }),
      } as RouteModule,
      "/virtual/_middleware.ts": {
        middleware: () => {
          ran = true;
        },
      },
    });
    const res = await handler(get("/api/hello"));
    expect(ran).toBe(true);
    expect(res.status).toBe(200);
  });
});

// --- Minimal Standard Schema implementation for tests (no zod dep) ---
const schema = {
  string: () =>
    ({
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (v: unknown) =>
          typeof v === "string" ? { value: v } : { issues: [{ message: "expected string" }] },
      },
    }) as any,
  object: (shape: Record<string, any>) =>
    ({
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (v: unknown) => {
          if (typeof v !== "object" || v === null)
            return { issues: [{ message: "expected object" }] };
          const issues: any[] = [];
          const out: Record<string, unknown> = {};
          for (const [key, s] of Object.entries(shape)) {
            const r = s["~standard"].validate((v as any)[key]);
            if (r.issues) {
              for (const i of r.issues) issues.push({ ...i, path: [key, ...(i.path ?? [])] });
            } else out[key] = r.value;
          }
          return issues.length ? { issues } : { value: out };
        },
      },
    }) as any,
};

describe("Route contracts", () => {
  const contractHandler = (routes: DiscoveredRoute[], modules: Record<string, RouteModule>) =>
    createRequestHandler({
      routes,
      loadModule: async (r) => modules[r.filePath] as RouteModule,
      security,
      lang: "en",
      validateContracts: true,
    });

  it("returns 400 when params violate the contract", async () => {
    const dyn: DiscoveredRoute = {
      id: "user/[id]/page.tsx",
      pattern: "user/:id",
      filePath: "/virtual/user/[id]/page.tsx",
      kind: "page",
      isDynamic: true,
      isCatchAll: false,
      score: 110,
    };
    const handler = contractHandler([dyn], {
      "/virtual/user/[id]/page.tsx": {
        default: () => <p>user</p>,
        contract: {
          params: schema.object({ id: schema.string() }),
          search: schema.object({ page: schema.string() }),
        },
      },
    });
    // /user/42 missing ?page -> search contract fails -> 400
    const res = await handler(get("/user/42"));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Contract violation");
    // with ?page it passes
    const ok = await handler(get("/user/42?page=1"));
    expect(ok.status).toBe(200);
  });

  it("turns a loader contract violation into a contract error", async () => {
    const errors: any[] = [];
    const handler = createRequestHandler({
      routes: [page("page.tsx", "/", "/virtual/page.tsx")],
      loadModule: async () =>
        ({
          default: () => <p>never</p>,
          loader: () => ({ wrong: 1 }),
          contract: { loader: schema.object({ title: schema.string() }) },
        }) as RouteModule,
      security,
      lang: "en",
      validateContracts: true,
      onError: (r) => errors.push(r),
    });
    const res = await handler(get("/"));
    expect(res.status).toBe(500);
    expect(errors[0]?.code).toBe("FROST_E_CONTRACT");
    expect(errors[0]?.message).toContain("title");
  });

  it("validates action input and returns 400 on violation", async () => {
    const handler = contractHandler([page("page.tsx", "/", "/virtual/page.tsx")], {
      "/virtual/page.tsx": {
        default: () => <p>form</p>,
        action: () => ({ saved: true }),
        contract: {
          action: schema.object({ name: schema.string() }),
        },
      },
    });
    const bad = await handler(
      new Request("http://localhost/", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "http://localhost",
        },
        body: "age=42",
      }),
    );
    expect(bad.status).toBe(400);
    expect(await bad.text()).toContain("name");

    const good = await handler(
      new Request("http://localhost/", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "http://localhost",
        },
        body: "name=frost",
      }),
    );
    expect(good.status).toBe(200);
  });

  it("skips validation when validateContracts is off", async () => {
    const handler = createRequestHandler({
      routes: [page("page.tsx", "/", "/virtual/page.tsx")],
      loadModule: async () =>
        ({
          default: () => <p>ok</p>,
          loader: () => ({ wrong: 1 }),
          contract: { loader: schema.object({ title: schema.string() }) },
        }) as RouteModule,
      security,
      lang: "en",
      // validateContracts omitted -> off
    });
    const res = await handler(get("/"));
    expect(res.status).toBe(200);
  });
});

describe("Client router data endpoint", () => {
  it("returns loader data as JSON for ?__frost_data=1", async () => {
    const handler = createRequestHandler({
      routes: [
        page("user/[id]/page.tsx", "user/:id", "/virtual/user/page.tsx", {
          isDynamic: true,
        }),
      ],
      loadModule: async () =>
        ({
          default: () => <p>u</p>,
          loader: ({ params }: any) => ({ id: params.id }),
        }) as RouteModule,
      security,
      lang: "en",
      routerEnabled: true,
      getAssetsForRoute: async () => ({ scripts: ["/assets/u.js"], css: ["/assets/u.css"] }),
    });
    const res = await handler(get("/user/42?__frost_data=1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.routeId).toBe("user/[id]/page.tsx");
    expect(body.loaderData).toEqual({ id: "42" });
    expect(body.params).toEqual({ id: "42" });
  });

  it("does not serve data JSON when the router is disabled", async () => {
    const handler = handlerFor([page("page.tsx", "/", "/virtual/page.tsx")], {
      "/virtual/page.tsx": { default: () => <p>hi</p> },
    });
    const res = await handler(get("/?__frost_data=1"));
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("emits __FROST_ROUTES__ manifest in HTML when router is enabled", async () => {
    const handler = createRequestHandler({
      routes: [page("page.tsx", "/", "/virtual/page.tsx")],
      loadModule: async () => ({ default: () => <p>hi</p> }) as RouteModule,
      security,
      lang: "en",
      routerEnabled: true,
      routerPrefetch: "intent",
      getAssetsForRoute: async () => ({ scripts: ["/a.js"], css: [] }),
    });
    const html = await (await handler(get("/"))).text();
    expect(html).toContain("__FROST_ROUTES__");
    expect(html).toContain("/a.js");
    expect(html).toContain('"prefetch":"intent"');
  });
});

describe("Streaming SSR", () => {
  it("streams the document when ssrStreaming is enabled", async () => {
    const handler = createRequestHandler({
      routes: [page("page.tsx", "/", "/virtual/page.tsx")],
      loadModule: async () => ({ default: () => <p>streamed</p> }) as RouteModule,
      security,
      lang: "en",
      ssrStreaming: true,
    });
    const res = await handler(get("/"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const text = await res.text();
    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain("streamed");
    expect(text).toContain("__FROST_DATA__");
  });

  it("still renders synchronously when streaming is off", async () => {
    const handler = handlerFor([page("page.tsx", "/", "/virtual/page.tsx")], {
      "/virtual/page.tsx": { default: () => <p>sync</p> },
    });
    const res = await handler(get("/"));
    expect(await res.text()).toContain("sync");
  });
});
