import { describe, it, expect } from "vitest";
import { validateModuleBoundary } from "../boundary.js";
import { FrostError } from "@frostjs/core";

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
