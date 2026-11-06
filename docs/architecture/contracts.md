# Frost Public API and Runtime Contracts

This document specifies the exact type definitions, function signatures, and contracts for Frost core subsystems.

---

## 1. Route Module Contract

A route file (e.g. `src/app/users/[id]/page.tsx`) conforms to the following module exports:

```typescript
import type { ReactNode } from "react";

export namespace Route {
  export interface LoaderArgs<TParams = Record<string, string>> {
    request: Request;
    params: TParams;
    url: URL;
    context: FrostRequestContext;
  }

  export interface ActionArgs<TParams = Record<string, string>> {
    request: Request;
    params: TParams;
    url: URL;
    context: FrostRequestContext;
  }

  export interface ComponentProps<TData = unknown, TParams = Record<string, string>> {
    data: TData;
    params: TParams;
    error?: Error;
  }

  export interface MetadataArgs<TData = unknown, TParams = Record<string, string>> {
    data?: TData;
    params: TParams;
    url: URL;
  }

  export interface Metadata {
    title?: string;
    description?: string;
    canonical?: string;
    openGraph?: {
      title?: string;
      description?: string;
      image?: string;
      type?: string;
    };
    meta?: Record<string, string>[];
    links?: Record<string, string>[];
  }

  export type RenderingMode = "static" | "server" | "incremental" | "client";

  export interface RenderingConfig {
    mode: RenderingMode;
    revalidateSeconds?: number;
    cacheTags?: string[];
  }
}

export type RouteLoader<TData = unknown, TParams = Record<string, string>> = (
  args: Route.LoaderArgs<TParams>
) => Promise<TData | Response> | TData | Response;

export type RouteAction<TResult = unknown, TParams = Record<string, string>> = (
  args: Route.ActionArgs<TParams>
) => Promise<TResult | Response> | TResult | Response;

export type RouteComponent<TData = unknown, TParams = Record<string, string>> = (
  props: Route.ComponentProps<TData, TParams>
) => ReactNode;

export type RouteMetadata<TData = unknown, TParams = Record<string, string>> =
  | Route.Metadata
  | ((args: Route.MetadataArgs<TData, TParams>) => Promise<Route.Metadata> | Route.Metadata);
```

---

## 2. Request Context Contract

```typescript
export interface FrostRequestContext {
  /**
   * Unique UUID assigned to the current HTTP request for tracing.
   */
  readonly requestId: string;

  /**
   * High-resolution timestamp when the request entered the server adapter.
   */
  readonly startTime: number;

  /**
   * Storage for request-scoped singletons and deduplication.
   */
  readonly memo: Map<string, unknown>;

  /**
   * Client IP address (forwarded or direct).
   */
  readonly clientIp?: string;

  /**
   * User agent header value.
   */
  readonly userAgent?: string;
}
```

---

## 3. Cache API Contract

```typescript
export interface CachePolicy {
  /**
   * Time to live in seconds.
   */
  ttl: number;

  /**
   * Invalidation tags associated with this cached entry.
   */
  tags?: string[];

  /**
   * Cache scope: "shared" for public multi-tenant/unauthenticated data,
   * "tenant" or "user" for isolated partition scopes.
   */
  scope?: "shared" | "tenant" | "user";

  /**
   * Allow returning stale cache while background revalidation executes.
   */
  staleWhileRevalidate?: boolean;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, policy: CachePolicy): Promise<void>;
  delete(key: string): Promise<boolean>;
  invalidateTag(tag: string): Promise<number>;
  clear(): Promise<void>;
}

export interface CacheDiagnostic {
  key: string;
  hit: boolean;
  layer: "memo" | "application" | "rendered" | "cdn";
  ttl?: number;
  tags?: string[];
  stale?: boolean;
  timeMs: number;
}
```

---

## 4. Production Manifest Contract

The `.frost/manifest.json` file generated at build time:

```typescript
export interface FrostManifest {
  version: string;
  buildId: string;
  timestamp: string;
  routes: Record<string, ManifestRouteEntry>;
  assets: {
    clientEntry: string;
    chunks: string[];
    css: string[];
  };
}

export interface ManifestRouteEntry {
  id: string;
  pattern: string;
  filePath: string;
  clientChunk?: string;
  serverChunk: string;
  cssChunks: string[];
  isLayout: boolean;
  renderingMode: "static" | "server" | "incremental" | "client";
  hasLoader: boolean;
  hasAction: boolean;
}
```

---

## 5. Rendering Ledger Contract

Every route evaluation produces a ledger entry:

```typescript
export interface RenderingLedgerEntry {
  routeId: string;
  url: string;
  renderingMode: "static" | "server" | "incremental" | "client";
  status: number;
  renderDurationMs: number;
  loaderDurationMs?: number;
  cacheDecisions: CacheDiagnostic[];
  dependencies: {
    serverOnly: string[];
    clientOnly: string[];
  };
  headersSent: Record<string, string>;
}
```

