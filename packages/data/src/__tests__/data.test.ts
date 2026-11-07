import { describe, it, expect, vi } from "vitest";
import { dedupe } from "../memo.js";
import { parseJson } from "../form.js";
import { validateCsrf } from "../csrf.js";
import { createServerFn } from "../server-fn.js";
import { createRequestContext, FrostError } from "@frostjs/core";

describe("Data package", () => {
  it("deduplicates requests within the same context memo", async () => {
    const context = createRequestContext();
    const fetchFn = vi.fn().mockResolvedValue({ id: 1, name: "User" });

    const p1 = dedupe(context, "user:1", fetchFn);
    const p2 = dedupe(context, "user:1", fetchFn);

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual({ id: 1, name: "User" });
    expect(r2).toEqual({ id: 1, name: "User" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("parses valid JSON body", async () => {
    const req = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
      headers: { "Content-Type": "application/json" },
    });

    const parsed = await parseJson<{ hello: string }>(req);
    expect(parsed.hello).toBe("world");
  });

  it("rejects cross-site CSRF mutation requests", () => {
    const crossSiteReq = new Request("http://localhost/", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });

    expect(() => validateCsrf(crossSiteReq)).toThrow(FrostError);
  });

  it("creates and executes typed server functions", async () => {
    const getUser = createServerFn({
      name: "getUser",
      handler: async (id: number) => ({ id, username: `user_${id}` }),
    });

    const user = await getUser(42);
    expect(user).toEqual({ id: 42, username: "user_42" });
    expect(getUser.fnName).toBe("getUser");
  });
});

