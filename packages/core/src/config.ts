export type LogLevel = "debug" | "info" | "warn" | "error";

export interface SecurityConfig {
  /**
   * Content-Security-Policy. `false` disables CSP entirely.
   * A string is used verbatim; the placeholder `{nonce}` is replaced with
   * the per-request nonce. When `true`/undefined a sensible default
   * report-only policy is used.
   */
  csp?: string | false;
  /** "report-only" (default) or "enforce". */
  cspMode?: "report-only" | "enforce";
  /**
   * Strict-Transport-Security. `true` enables with defaults,
   * an object customizes it, `false`/undefined disables it.
   */
  hsts?: boolean | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean };
  /**
   * Permissions-Policy header value. `false` disables, a string sets it
   * verbatim, an object maps feature -> allowlist ("()" denies).
   * Defaults to denying camera, microphone, and geolocation.
   */
  permissionsPolicy?: string | false | Record<string, string>;
}

export interface DevConfig {
  watch?: {
    /** Use fs polling instead of native events (fallback for network drives/WSL). */
    usePolling?: boolean;
    interval?: number;
  };
  /** Dev-only: render each route twice and warn on nondeterministic output. */
  checkDeterminism?: boolean;
  /** Show the styled Frost error overlay in the browser (default true). */
  overlay?: boolean;
}

export interface CompressionConfig {
  enabled?: boolean;
  brotli?: boolean;
  gzip?: boolean;
  /** Minimum body size in bytes to compress. Default 1024. */
  threshold?: number;
}

export interface BudgetsConfig {
  /** Warn (or fail with --strict) when a route's client JS exceeds this size in KB. */
  clientJsKb?: number;
  /** Fail the build when a budget is exceeded. */
  strict?: boolean;
}

export interface ContractsConfig {
  /** Validate route contracts in production builds/servers too (default false = dev only). */
  validateInProduction?: boolean;
}

export interface ClientRouterConfig {
  /** Opt-in client-side router with fetch-based navigation. */
  enabled?: boolean;
  prefetch?: "intent" | "viewport" | "none";
}

export interface SsrConfig {
  /** Stream the document with Suspense support (default true). */
  streaming?: boolean;
}

export interface LoggingConfig {
  level?: LogLevel;
  /** Log one line per request in development. */
  requestLogs?: boolean;
  /** "pretty" for humans, "json" for log aggregation. */
  format?: "pretty" | "json";
}

export interface SeoConfig {
  /** Generate sitemap.xml at build time (static routes only). */
  sitemap?: boolean;
  /** Generate robots.txt at build time. */
  robots?: boolean;
  /** Absolute site origin used in generated URLs (e.g. "https://example.com"). */
  baseUrl?: string;
}

export interface ServerFnsConfig {
  /** URL prefix for the server-function RPC endpoint. Default "/_frost/fn". */
  path?: string;
}

export interface EnvConfig {
  /** Variable names that must be present at startup or the CLI fails fast. */
  required?: string[];
  /** Prefix exposed to client code. Default "FROST_PUBLIC_". */
  publicPrefix?: string;
}

export interface LimitsConfig {
  /** Max bytes for urlencoded/multipart form bodies. Default 1 MiB. */
  formBytes?: number;
  /** Max bytes for JSON bodies. Default 1 MiB. */
  jsonBytes?: number;
}

export interface FrostConfig {
  /** Application metadata. */
  app?: {
    /** Used in default metadata/OG site name. Default "Frost". */
    name?: string;
    /** html lang attribute. Default "en". */
    lang?: string;
  };
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

  security?: SecurityConfig;
  dev?: DevConfig;
  compression?: CompressionConfig;
  budgets?: BudgetsConfig;
  contracts?: ContractsConfig;
  router?: ClientRouterConfig;
  ssr?: SsrConfig;
  logging?: LoggingConfig;
  env?: EnvConfig;
  seo?: SeoConfig;
  serverFns?: ServerFnsConfig;
  limits?: LimitsConfig;
}

export interface ResolvedSecurityConfig {
  csp: string | false;
  cspMode: "report-only" | "enforce";
  hsts: false | { maxAge: number; includeSubDomains: boolean; preload: boolean };
  permissionsPolicy: string | false;
}

export interface ResolvedFrostConfig {
  app: { name: string; lang: string };
  appDirectory: string;
  apiDirectory: string;
  publicDirectory: string;
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
  security: ResolvedSecurityConfig;
  dev: Required<Omit<DevConfig, "watch">> & { watch: { usePolling: boolean; interval: number } };
  compression: Required<CompressionConfig>;
  budgets: BudgetsConfig;
  contracts: Required<ContractsConfig>;
  router: { enabled: boolean; prefetch: "intent" | "viewport" | "none" };
  ssr: Required<SsrConfig>;
  logging: Required<LoggingConfig>;
  env: Required<EnvConfig>;
  seo: { sitemap: boolean; robots: boolean; baseUrl?: string };
  serverFns: { path: string };
  limits: Required<LimitsConfig>;
}

/** Default CSP used when security.csp is unset (report-only mode). */
export const DEFAULT_CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{nonce}'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export const defaultFrostConfig: ResolvedFrostConfig = {
  app: { name: "Frost", lang: "en" },
  appDirectory: "src/app",
  apiDirectory: "src/api",
  publicDirectory: "public",
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
  security: {
    csp: DEFAULT_CSP_POLICY,
    cspMode: "report-only",
    hsts: false,
    permissionsPolicy: "camera=(), microphone=(), geolocation=()",
  },
  dev: {
    watch: { usePolling: false, interval: 100 },
    checkDeterminism: false,
    overlay: true,
  },
  compression: {
    enabled: true,
    brotli: true,
    gzip: true,
    threshold: 1024,
  },
  budgets: {},
  contracts: {
    validateInProduction: false,
  },
  router: {
    enabled: false,
    prefetch: "intent",
  },
  ssr: {
    streaming: true,
  },
  logging: {
    level: "info",
    requestLogs: false,
    format: "pretty",
  },
  env: {
    required: [],
    publicPrefix: "FROST_PUBLIC_",
  },
  seo: {
    sitemap: false,
    robots: false,
  },
  serverFns: {
    path: "/_frost/fn",
  },
  limits: {
    formBytes: 1024 * 1024,
    jsonBytes: 1024 * 1024,
  },
};

export function defineConfig(config: FrostConfig): FrostConfig {
  return config;
}

function resolvePermissionsPolicy(
  input: SecurityConfig["permissionsPolicy"]
): string | false {
  if (input === false) return false;
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    return Object.entries(input)
      .map(([feature, allowlist]) => `${feature}=${allowlist}`)
      .join(", ");
  }
  return defaultFrostConfig.security.permissionsPolicy as string;
}

export function resolveConfig(config: FrostConfig = {}): ResolvedFrostConfig {
  const cspInput = config.security?.csp;
  const csp =
    cspInput === false
      ? false
      : typeof cspInput === "string"
        ? cspInput
        : DEFAULT_CSP_POLICY;

  const hstsInput = config.security?.hsts;
  const hsts =
    hstsInput === true
      ? { maxAge: 31536000, includeSubDomains: true, preload: false }
      : hstsInput && typeof hstsInput === "object"
        ? {
            maxAge: hstsInput.maxAge ?? 31536000,
            includeSubDomains: hstsInput.includeSubDomains ?? true,
            preload: hstsInput.preload ?? false,
          }
        : false;

  return {
    app: {
      name: config.app?.name ?? defaultFrostConfig.app.name,
      lang: config.app?.lang ?? defaultFrostConfig.app.lang,
    },
    appDirectory: config.appDirectory ?? defaultFrostConfig.appDirectory,
    apiDirectory: config.apiDirectory ?? defaultFrostConfig.apiDirectory,
    publicDirectory: config.publicDirectory ?? defaultFrostConfig.publicDirectory,
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
    security: {
      csp,
      cspMode: config.security?.cspMode ?? defaultFrostConfig.security.cspMode,
      hsts,
      permissionsPolicy: resolvePermissionsPolicy(config.security?.permissionsPolicy),
    },
    dev: {
      watch: {
        usePolling: config.dev?.watch?.usePolling ?? false,
        interval: config.dev?.watch?.interval ?? 100,
      },
      checkDeterminism: config.dev?.checkDeterminism ?? false,
      overlay: config.dev?.overlay ?? true,
    },
    compression: {
      enabled: config.compression?.enabled ?? true,
      brotli: config.compression?.brotli ?? true,
      gzip: config.compression?.gzip ?? true,
      threshold: config.compression?.threshold ?? 1024,
    },
    budgets: {
      clientJsKb: config.budgets?.clientJsKb,
      strict: config.budgets?.strict ?? false,
    },
    contracts: {
      validateInProduction:
        config.contracts?.validateInProduction ?? false,
    },
    router: {
      enabled: config.router?.enabled ?? false,
      prefetch: config.router?.prefetch ?? "intent",
    },
    ssr: {
      streaming: config.ssr?.streaming ?? true,
    },
    logging: {
      level: config.logging?.level ?? "info",
      requestLogs: config.logging?.requestLogs ?? false,
      format: config.logging?.format ?? "pretty",
    },
    env: {
      required: config.env?.required ?? [],
      publicPrefix: config.env?.publicPrefix ?? "FROST_PUBLIC_",
    },
    seo: {
      sitemap: config.seo?.sitemap ?? false,
      robots: config.seo?.robots ?? false,
      baseUrl: config.seo?.baseUrl,
    },
    serverFns: {
      path: config.serverFns?.path ?? "/_frost/fn",
    },
    limits: {
      formBytes: config.limits?.formBytes ?? defaultFrostConfig.limits.formBytes,
      jsonBytes: config.limits?.jsonBytes ?? defaultFrostConfig.limits.jsonBytes,
    },
  };
}
