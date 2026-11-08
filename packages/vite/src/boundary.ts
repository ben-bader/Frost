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

const ENV_DOT_RE = /\bprocess\.env\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
const ENV_BRACKET_RE = /\bprocess\.env\[\s*["'`]([A-Za-z_$][A-Za-z0-9_$]*)["'`]\s*\]/g;
/** Variables safe to read in client code: NODE_ENV plus the public prefix. */
const ENV_ALLOW_PREFIX = "FROST_PUBLIC_";
const ENV_ALLOW_EXACT = new Set(["NODE_ENV"]);

/**
 * Scans client-bound module source for `process.env.*` reads. Only
 * NODE_ENV and variables prefixed with FROST_PUBLIC_ are allowed —
 * everything else would either crash at runtime or leak a secret into
 * the browser bundle.
 */
export function validateClientEnvAccess(code: string, id: string): void {
  const offenders = new Set<string>();
  for (const re of [ENV_DOT_RE, ENV_BRACKET_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      const name = m[1]!;
      if (!ENV_ALLOW_EXACT.has(name) && !name.startsWith(ENV_ALLOW_PREFIX)) {
        offenders.add(name);
      }
    }
  }
  if (offenders.size > 0) {
    const names = [...offenders].sort().join(", ");
    throw new FrostError(
      `Client code reads disallowed environment variable(s): ${names}.`,
      {
        code: "FS1009",
        importer: id,
        hint: `Only NODE_ENV and ${ENV_ALLOW_PREFIX}* variables may be read in client code. Move other env access into a loader, action, or .server module.`,
        docsUrl: "https://frostjs.dev/docs/errors/FS1009",
      }
    );
  }
}

