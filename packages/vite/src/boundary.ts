import { FrostError } from "@frostjs/core";

const NODE_BUILTINS = new Set([
  "node:fs",
  "node:fs/promises",
  "node:path",
  "node:crypto",
  "node:child_process",
  "node:net",
  "node:http",
  "node:https",
  "node:os",
  "node:stream",
  "node:worker_threads",
  "fs",
  "path",
  "crypto",
  "child_process",
  "net",
  "http",
  "https",
  "os",
  "stream",
]);

export function validateModuleBoundary(
  source: string,
  importer: string | undefined,
  isClientBuild: boolean
): void {
  if (!isClientBuild || !importer) {
    return;
  }

  // 1. Check for .server.ts / .server.tsx files imported into client
  if (/\.server\.[tj]sx?$/.test(source) || /\.server$/.test(source)) {
    throw new FrostError(`Server-only module imported into client bundle.`, {
      code: "FS1004",
      importer,
      target: source,
      hint: "Move the privileged operation into a server loader or API action, and pass only public data to the client component.",
      docsUrl: "https://frostjs.dev/docs/errors/FS1004",
    });
  }

  // 2. Check for node built-in modules imported into client
  if (NODE_BUILTINS.has(source)) {
    throw new FrostError(`Node.js built-in module '${source}' imported into client bundle.`, {
      code: "FS1004",
      importer,
      target: source,
      hint: "Node.js runtime APIs cannot execute in the browser. Access them only from loaders or .server.ts modules.",
      docsUrl: "https://frostjs.dev/docs/errors/FS1004",
    });
  }
}
