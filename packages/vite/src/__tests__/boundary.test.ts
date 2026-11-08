import { describe, it, expect } from "vitest";
import { validateClientEnvAccess, validateModuleBoundary } from "../boundary.js";
import { FrostError } from "@frost.js/core";

describe("Boundary enforcement in Vite plugin", () => {
  it("allows universal modules in client bundle", () => {
    expect(() => {
      validateModuleBoundary("./utils.ts", "/src/components/Header.tsx", true);
    }).not.toThrow();
  });

  it("throws FS1004 when a client bundle imports a .server.ts file", () => {
    try {
      validateModuleBoundary("./db.server.ts", "/src/components/UserProfile.client.tsx", true);
      expect.fail("Should have thrown FS1004");
    } catch (err) {
      expect(err).toBeInstanceOf(FrostError);
      const fe = err as FrostError;
      expect(fe.code).toBe("FS1004");
      expect(fe.importer).toBe("/src/components/UserProfile.client.tsx");
      expect(fe.target).toBe("./db.server.ts");
    }
  });

  it("throws FS1004 when a client bundle imports a node built-in", () => {
    try {
      validateModuleBoundary("node:fs", "/src/app/page.tsx", true);
      expect.fail("Should have thrown FS1004");
    } catch (err) {
      expect(err).toBeInstanceOf(FrostError);
      const fe = err as FrostError;
      expect(fe.code).toBe("FS1004");
      expect(fe.target).toBe("node:fs");
    }
  });

  it("permits .server.ts and node built-ins in server (SSR) builds", () => {
    expect(() => {
      validateModuleBoundary("./db.server.ts", "/src/app/page.tsx", false);
    }).not.toThrow();

    expect(() => {
      validateModuleBoundary("node:fs", "/src/server/file.ts", false);
    }).not.toThrow();
  });
});

describe("Client env access guard", () => {
  it("allows NODE_ENV and FROST_PUBLIC_* variables", () => {
    expect(() =>
      validateClientEnvAccess(
        "const a = process.env.NODE_ENV; const b = process.env.FROST_PUBLIC_API_URL;",
        "/src/app/page.tsx",
      ),
    ).not.toThrow();
  });

  it("throws FS1009 for server env vars in client code", () => {
    try {
      validateClientEnvAccess(
        "const key = process.env.STRIPE_SECRET_KEY;",
        "/src/components/Checkout.tsx",
      );
      expect.fail("Should have thrown FS1009");
    } catch (err) {
      expect(err).toBeInstanceOf(FrostError);
      expect((err as FrostError).code).toBe("FS1009");
      expect((err as FrostError).message).toContain("STRIPE_SECRET_KEY");
    }
  });

  it("catches bracket notation and reports all offenders", () => {
    try {
      validateClientEnvAccess(
        'const a = process.env["DATABASE_URL"]; const b = process.env.REDIS_HOST;',
        "/src/app/page.tsx",
      );
      expect.fail("Should have thrown FS1009");
    } catch (err) {
      const fe = err as FrostError;
      expect(fe.code).toBe("FS1009");
      expect(fe.message).toContain("DATABASE_URL");
      expect(fe.message).toContain("REDIS_HOST");
    }
  });
});
