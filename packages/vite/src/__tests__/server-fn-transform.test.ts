import { describe, it, expect } from "vitest";
import { transformServerFnCalls } from "../server-fn-transform.js";

const IMPORT = `import { createServerFn } from "@frost.js/data";\n`;

describe("transformServerFnCalls", () => {
  it("replaces createServerFn config calls with fetch stubs", () => {
    const src =
      IMPORT +
      `export const double = createServerFn({\n` +
      `  name: "math.double",\n` +
      `  handler: async (input) => input * 2,\n` +
      `  requireCsrf: true,\n` +
      `});\n` +
      `export const use = () => double(2);\n`;
    const out = transformServerFnCalls(src);
    expect(out).not.toBeNull();
    expect(out).toContain('__frostServerFnFetch("math.double")');
    expect(out).toContain("virtual:frost/server-fn-client");
    // handler body must be gone
    expect(out).not.toContain("input * 2");
    expect(out).toContain("double(2)");
  });

  it("handles nested parens/braces inside the handler", () => {
    const src =
      IMPORT +
      `const f = createServerFn({ name: "x.y", handler: async () => ({ a: [1, { b: (2) }] }) });\n`;
    const out = transformServerFnCalls(src)!;
    expect(out).toContain('__frostServerFnFetch("x.y")');
    expect(out).not.toContain("a: [1");
  });

  it("ignores files without the @frost.js/data import", () => {
    const src = `const f = createServerFn({ name: "x", handler: async () => 1 });\n`;
    expect(transformServerFnCalls(src)).toBeNull();
  });

  it("leaves non-literal names untouched", () => {
    const src =
      IMPORT +
      `const name = "dyn";\n` +
      `const f = createServerFn({ name, handler: async () => 1 });\n`;
    // name: is shorthand — NAME_RE won't match `name,` so call is kept
    expect(transformServerFnCalls(src)).toBeNull();
  });

  it("handles multiple calls in one file", () => {
    const src =
      IMPORT +
      `const a = createServerFn({ name: "a", handler: async () => 1 });\n` +
      `const b = createServerFn({ name: "b", handler: async () => 2 });\n`;
    const out = transformServerFnCalls(src)!;
    expect(out).toContain('__frostServerFnFetch("a")');
    expect(out).toContain('__frostServerFnFetch("b")');
  });
});
