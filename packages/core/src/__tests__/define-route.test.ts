import { describe, it, expectTypeOf } from "vitest";
import { defineRoute } from "../define-route.js";

describe("defineRoute type inference", () => {
  it("infers loader return type into the component data prop", () => {
    defineRoute({
      loader: async () => ({ title: "hi", count: 1 }),
      default: ({ data }) => {
        expectTypeOf(data.title).toEqualTypeOf<string>();
        expectTypeOf(data.count).toEqualTypeOf<number>();
        return null;
      },
    });
  });

  it("infers action return type into actionData", () => {
    defineRoute({
      loader: async () => ({ ok: true }),
      action: async () => ({ saved: "yes" }),
      default: ({ actionData }) => {
        expectTypeOf(actionData).toEqualTypeOf<{ saved: string } | undefined>();
        return null;
      },
    });
  });

  it("rejects misuse of inferred data", () => {
    defineRoute({
      loader: async () => ({ title: "hi" }),
      default: ({ data }) => {
        // @ts-expect-error - title is a string, not a number
        return data.title.toFixed();
      },
    });
  });

  it("params default to Record<string, string>", () => {
    defineRoute({
      loader: async ({ params }) => {
        expectTypeOf(params).toEqualTypeOf<Record<string, string>>();
        return null;
      },
      default: ({ params }) => {
        expectTypeOf(params).toEqualTypeOf<Record<string, string>>();
        return null;
      },
    });
  });
});
