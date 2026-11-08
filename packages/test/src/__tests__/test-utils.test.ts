import { describe, it, expect } from "vitest";
import { createTestHandler, renderRoute, callLoader, callAction } from "../index.js";
import type { RouteModule } from "@frost.js/core";
import type { DiscoveredRoute } from "@frost.js/router";

const pageRoute: DiscoveredRoute = {
  id: "page.tsx",
  pattern: "/",
  filePath: "/virtual/page.tsx",
  kind: "page",
  isDynamic: false,
  isCatchAll: false,
  score: 100,
};

describe("@frost.js/test", () => {
  it("createTestHandler serves in-memory modules", async () => {
    const handler = createTestHandler({
      routes: [pageRoute],
      modules: {
        "/virtual/page.tsx": { default: () => null },
      },
    });
    const res = await handler(new Request("http://localhost/"));
    expect(res.status).toBe(200);
  });

  it("renderRoute renders a module with loader data", async () => {
    const mod: RouteModule = {
      default: () => null,
      loader: () => ({ hello: "world" }),
    };
    const res = await renderRoute(mod);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("__FROST_DATA__");
  });

  it("callLoader and callAction invoke exports directly", async () => {
    const mod: RouteModule = {
      loader: async ({ params }: any) => ({ id: params.id }),
      action: async () => ({ saved: true }),
    };
    expect(await callLoader(mod, { params: { id: "7" } })).toEqual({ id: "7" });
    expect(await callAction(mod)).toEqual({ saved: true });
  });
});
