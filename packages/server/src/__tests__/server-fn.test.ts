import { describe, it, expect } from "vitest";
import { createRequestHandler } from "../handler.js";
import { resolveConfig } from "@frost.js/core";
import { createServerFn, getServerFn } from "@frost.js/data";

const security = resolveConfig().security;

function handler() {
  return createRequestHandler({
    routes: [],
    loadModule: async () => ({}),
    security,
    lang: "en",
  });
}

const post = (path: string, body?: unknown, init?: RequestInit) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });

describe("createServerFn transport", () => {
  it("registers the function and serves POST /_frost/fn/<id>", async () => {
    const fn = createServerFn<{ a: number }, { doubled: number }>({
      name: "test.double",
      handler: async (input) => ({ doubled: input.a * 2 }),
    });
    // Direct call still works on the server.
    expect(await fn({ a: 21 })).toEqual({ doubled: 42 });
    expect(getServerFn("test.double")).toBeDefined();

    const res = await handler()(post("/_frost/fn/test.double", { input: { a: 3 } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: { doubled: 6 } });
  });

  it("rejects non-POST methods with 405 + Allow", async () => {
    createServerFn({ name: "test.getonly", handler: async () => 1 });
    const res = await handler()(new Request("http://localhost/_frost/fn/test.getonly"));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("returns 404 for unknown function ids", async () => {
    const res = await handler()(post("/_frost/fn/nope.missing", {}));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("FROST_E_SERVERFN");
  });

  it("runs validateInput and returns FROST_E_CONTRACT on failure", async () => {
    createServerFn({
      name: "test.validated",
      handler: async (input: { n: number }) => input.n,
      validateInput: (raw) => {
        const n = (raw as { n?: unknown })?.n;
        if (typeof n !== "number") throw new Error("n must be a number");
        return { n };
      },
    });
    const bad = await handler()(post("/_frost/fn/test.validated", { input: { n: "x" } }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("FROST_E_CONTRACT");

    const good = await handler()(post("/_frost/fn/test.validated", { input: { n: 7 } }));
    expect(await good.json()).toEqual({ result: 7 });
  });

  it("returns typed errors without stack traces", async () => {
    createServerFn({
      name: "test.boom",
      handler: async () => {
        const e = new Error("kaput");
        (e as { code?: string }).code = "FROST_E_ACTION";
        throw e;
      },
    });
    const res = await handler()(post("/_frost/fn/test.boom", {}));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("FROST_E_ACTION");
    expect(body.error.message).toBe("kaput");
    expect(JSON.stringify(body)).not.toContain("stack");
  });
});
