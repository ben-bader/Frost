import { describe, it, expect } from "vitest";
import { matchPattern } from "../router.js";

describe("matchPattern (client router)", () => {
  it("matches static routes", () => {
    expect(matchPattern("", "/")).toEqual({ params: {} });
    expect(matchPattern("playground", "/playground")).toEqual({ params: {} });
    expect(matchPattern("playground", "/other")).toBeNull();
  });

  it("matches dynamic segments", () => {
    expect(matchPattern("user/:id", "/user/42")).toEqual({
      params: { id: "42" },
    });
    expect(matchPattern("user/:id", "/user")).toBeNull();
    expect(matchPattern("user/:id/posts/:pid", "/user/1/posts/2")).toEqual({
      params: { id: "1", pid: "2" },
    });
  });

  it("matches catch-all routes", () => {
    expect(matchPattern("docs/*slug", "/docs/a/b/c")).toEqual({
      params: { slug: "a/b/c" },
    });
    expect(matchPattern("docs/*slug", "/other/x")).toBeNull();
  });

  it("decodes dynamic params", () => {
    expect(matchPattern("tag/:name", "/tag/hello%20world")).toEqual({
      params: { name: "hello world" },
    });
  });
});
