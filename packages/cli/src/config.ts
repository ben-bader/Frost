import * as path from "node:path";
import * as fs from "node:fs";
import { loadConfigFromFile } from "vite";
import type { FrostConfig } from "@frost.js/core";

const CONFIG_CANDIDATES = ["frost.config.ts", "frost.config.js", "frost.config.mjs"];

export interface LoadConfigOptions {
  rootDir?: string;
  /** Explicit --config <path>; absolute or relative to rootDir. */
  configPath?: string;
}

/**
 * Locates the Frost config file without loading it. Returns the resolved
 * absolute path, or undefined when no config file exists. Throws when an
 * explicit --config path does not exist.
 */
export function findFrostConfigFile(options: LoadConfigOptions = {}): string | undefined {
  const rootDir = options.rootDir ?? process.cwd();

  if (options.configPath) {
    const resolved = path.resolve(rootDir, options.configPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Frost config file not found: ${resolved}`);
    }
    return resolved;
  }

  for (const candidate of CONFIG_CANDIDATES) {
    const full = path.join(rootDir, candidate);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return undefined;
}

/**
 * Locates and loads the Frost config file for a project.
 *
 * Search order:
 *  1. Explicit `configPath` (--config flag)
 *  2. frost.config.ts / .js / .mjs in rootDir
 *
 * Returns an empty object when no config file exists.
 * Throws a Frost-style error with the file path when the file exists but
 * cannot be parsed or does not export a plain object.
 */
export async function loadFrostConfig(options: LoadConfigOptions = {}): Promise<FrostConfig> {
  const rootDir = options.rootDir ?? process.cwd();
  const configFile = findFrostConfigFile(options);

  if (!configFile) {
    return {};
  }

  let loaded: { config: unknown };
  try {
    // Vite's loader bundles the config with esbuild first, so TypeScript,
    // ESM, and CJS config files all work. Vite is already a CLI dependency.
    const result = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      configFile,
      rootDir,
    );
    if (!result) {
      throw new Error("config file did not produce a result");
    }
    loaded = result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load Frost config at ${configFile}:\n${message}`);
  }

  const raw = (loaded as { config?: unknown }).config;
  if (raw === undefined || raw === null) {
    return {};
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      `Invalid Frost config at ${configFile}: expected an object exported via defineConfig() or a default export.`,
    );
  }

  // Vite's loader may return a promise-wrapped default export already
  // resolved; the shape we accept is the FrostConfig object itself.
  return raw as FrostConfig;
}

/**
 * Merges a file config with CLI flag overrides. CLI flags win for the
 * fields they set; everything else comes from the config file.
 */
export function mergeCliOverrides(
  fileConfig: FrostConfig,
  overrides: { port?: number; host?: string },
): FrostConfig {
  if (overrides.port === undefined && overrides.host === undefined) {
    return fileConfig;
  }
  return {
    ...fileConfig,
    server: {
      ...fileConfig.server,
      ...(overrides.port !== undefined ? { port: overrides.port } : {}),
      ...(overrides.host !== undefined ? { host: overrides.host } : {}),
    },
  };
}
