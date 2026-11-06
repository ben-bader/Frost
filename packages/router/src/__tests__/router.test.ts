import { describe, it, expect } from "vitest";
import { normalizePathname, filePathToPattern } from "../normalize.js";
import { compilePattern, matchRoutes } from "../matcher.js";

describe("Router normalization", () => {
  it("normalizes root path", () => {
    expect(normalizePathname("")).toBe("/");
    expect(normalizePathname("/")).toBe("/");
    expect(normalizePathname("///")).toBe("/");
  });

  it("normalizes paths and strips trailing slashes", () => {
    expect(normalizePathname("/users/")).toBe("/users");
    expect(normalizePathname("users/123/")).toBe("/users/123");
    expect(normalizePathname("//users///123//")).toBe("/users/123");
  });
});

describe("File path to route pattern", () => {
  it("maps root page to /", () => {
    const res = filePathToPattern("page.tsx");
    expect(res.pattern).toBe("/");
    expect(res.isDynamic).toBe(false);
  });

  it("maps nested static page", () => {
    const res = filePathToPattern("about/page.tsx");
    expect(res.pattern).toBe("/about");
    expect(res.isDynamic).toBe(false);
  });

  it("maps dynamic param [id]", () => {
    const res = filePathToPattern("users/[id]/page.tsx");
    expect(res.pattern).toBe("/users/:id");
    expect(res.isDynamic).toBe(true);
    expect(res.isCatchAll).toBe(false);
  });

  it("maps catch-all [...slug]", () => {
    const res = filePathToPattern("docs/[...slug]/page.tsx");
    expect(res.pattern).toBe("/docs/*slug");
    expect(res.isDynamic).toBe(false);
    expect(res.isCatchAll).toBe(true);
  });
});

describe("Route matching and precedence", () => {
  it("prioritizes static over dynamic and dynamic over catch-all", () => {
    const staticRoute = filePathToPattern("users/new/page.tsx");
    const dynamicRoute = filePathToPattern("users/[id]/page.tsx");
    const catchAllRoute = filePathToPattern("users/[...all]/page.tsx");

    expect(staticRoute.score).toBeGreaterThan(dynamicRoute.score);
    expect(dynamicRoute.score).toBeGreaterThan(catchAllRoute.score);

    const routes = [
      compilePattern({ id: "static" }, staticRoute.pattern),
      compilePattern({ id: "dynamic" }, dynamicRoute.pattern),
      compilePattern({ id: "catchAll" }, catchAllRoute.pattern),
    ];

    // Request to static /users/new
    const matchStatic = matchRoutes(routes, "/users/new");
    expect(matchStatic?.route.id).toBe("static");

    // Request to dynamic /users/42
    const matchDynamic = matchRoutes(routes, "/users/42");
    expect(matchDynamic?.route.id).toBe("dynamic");
    expect(matchDynamic?.params.id).toBe("42");

    // Request to /users/42/settings
    const matchCatchAll = matchRoutes(routes, "/users/42/settings");
    expect(matchCatchAll?.route.id).toBe("catchAll");
    expect(matchCatchAll?.params.all).toBe("42/settings");
  });

  it("decodes URL components safely", () => {
    const routes = [
      compilePattern({ id: "user" }, "/users/:name"),
    ];

    const match = matchRoutes(routes, "/users/Alice%20Smith");
    expect(match?.params.name).toBe("Alice Smith");
  });
});

