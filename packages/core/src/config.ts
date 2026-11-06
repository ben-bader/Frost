import type { RenderingMode } from "./types.js";

export interface FrostConfig {
  /**
   * Application source directory containing pages, layouts, and API routes.
   * Defaults to "src/app".
   */
  appDirectory?: string;

  /**
   * Directory containing API route endpoints.
   * Defaults to "src/api".
   */
  apiDirectory?: string;

  /**
   * Public static assets directory.
   * Defaults to "public".
   */
  publicDirectory?: string;

  /**
   * Rendering configuration defaults.
   */
  rendering?: {
    default?: RenderingMode;
  };

  /**
   * Cache configuration defaults.
   */
  cache?: {
    default?: "no-store" | "memory";
    maxMemoryEntries?: number;
  };

  /**
   * Development and production server options.
   */
  server?: {
    port?: number;
    host?: string;
  };

  /**
   * Build output options.
   */
  build?: {
    outDir?: string;
    sourcemap?: boolean;
  };
}

export interface ResolvedFrostConfig {
  appDirectory: string;
  apiDirectory: string;
  publicDirectory: string;
  rendering: {
    default: RenderingMode;
  };
  cache: {
    default: "no-store" | "memory";
    maxMemoryEntries: number;
  };
  server: {
    port: number;
    host: string;
  };
  build: {
    outDir: string;
    sourcemap: boolean;
  };
}

export const defaultFrostConfig: ResolvedFrostConfig = {
  appDirectory: "src/app",
  apiDirectory: "src/api",
  publicDirectory: "public",
  rendering: {
    default: "server",
  },
  cache: {
    default: "no-store",
    maxMemoryEntries: 1000,
  },
  server: {
    port: 3000,
    host: "localhost",
  },
  build: {
    outDir: ".frost",
    sourcemap: true,
  },
};

export function defineConfig(config: FrostConfig): FrostConfig {
  return config;
}

export function resolveConfig(config: FrostConfig = {}): ResolvedFrostConfig {
  return {
    appDirectory: config.appDirectory ?? defaultFrostConfig.appDirectory,
    apiDirectory: config.apiDirectory ?? defaultFrostConfig.apiDirectory,
    publicDirectory: config.publicDirectory ?? defaultFrostConfig.publicDirectory,
    rendering: {
      default: config.rendering?.default ?? defaultFrostConfig.rendering.default,
    },
    cache: {
      default: config.cache?.default ?? defaultFrostConfig.cache.default,
      maxMemoryEntries: config.cache?.maxMemoryEntries ?? defaultFrostConfig.cache.maxMemoryEntries,
    },
    server: {
      port: config.server?.port ?? defaultFrostConfig.server.port,
      host: config.server?.host ?? defaultFrostConfig.server.host,
    },
    build: {
      outDir: config.build?.outDir ?? defaultFrostConfig.build.outDir,
      sourcemap: config.build?.sourcemap ?? defaultFrostConfig.build.sourcemap,
    },
  };
}
