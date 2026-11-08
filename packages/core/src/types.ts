import type { ReactNode } from "react";

export interface FrostAssetPreload {
  href: string;
  as: string;
  type?: string;
  crossOrigin?: boolean;
  /** Defaults to "preload"; "modulepreload" for JS module dependencies. */
  rel?: "preload" | "modulepreload";
}

export interface FrostAssets {
  scripts: string[];
  css: string[];
  preloads?: FrostAssetPreload[];
}

export interface FrostRequestContext {
  readonly requestId: string;
  readonly startTime: number;
  readonly memo: Map<string, unknown>;
  readonly clientIp?: string;
  readonly userAgent?: string;
  /** Per-request CSP nonce, present when security.csp is enabled. */
  readonly cspNonce?: string;
}

/* eslint-disable @typescript-eslint/no-namespace -- Route.* is Frost's public route-type API surface */
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

  export interface ComponentProps<TData = any, TParams = Record<string, string>> {
    data: TData;
    params: TParams;
    children?: ReactNode;
    error?: Error;
    /** Result of the route action when the page re-renders after a POST. */
    actionData?: unknown;
  }

  export interface MetadataArgs<TData = any, TParams = Record<string, string>> {
    data?: TData;
    params: TParams;
    url: URL;
  }

  export interface Metadata {
    title?: string;
    /**
     * Title template applied to descendant titles, e.g. "%s | My App".
     * The nearest ancestor template wins; "%s" is replaced by the child
     * title. A template with no "%s" is used verbatim.
     */
    titleTemplate?: string;
    description?: string;
    canonical?: string;
    /** robots meta content, e.g. "index, follow" or "noindex". */
    robots?: string;
    openGraph?: {
      title?: string;
      description?: string;
      image?: string;
      type?: string;
      url?: string;
      siteName?: string;
    };
    twitter?: {
      card?: "summary" | "summary_large_image" | "app" | "player";
      title?: string;
      description?: string;
      image?: string;
      site?: string;
    };
    /** JSON-LD structured data objects; serialized and escaped on render. */
    jsonLd?: unknown | unknown[];
    meta?: Array<Record<string, string>>;
    links?: Array<Record<string, string>>;
    scripts?: Array<{ src?: string; content?: string; type?: string; async?: boolean }>;
  }
}

export type RouteLoader<TData = any, TParams = Record<string, string>> = (
  args: Route.LoaderArgs<TParams>,
) => Promise<TData | Response> | TData | Response;

export type RouteAction<TResult = any, TParams = Record<string, string>> = (
  args: Route.ActionArgs<TParams>,
) => Promise<TResult | Response> | TResult | Response;

export type RouteComponent<TData = any, TParams = Record<string, string>> = (
  props: Route.ComponentProps<TData, TParams>,
) => ReactNode;

export type RouteMetadata<TData = any, TParams = Record<string, string>> =
  | Route.Metadata
  | ((args: Route.MetadataArgs<TData, TParams>) => Promise<Route.Metadata> | Route.Metadata);

export interface RouteHeadersArgs<TParams = Record<string, string>> {
  request: Request;
  params: TParams;
  url: URL;
  context: FrostRequestContext;
}

export type RouteHeaders<TParams = Record<string, string>> =
  | Record<string, string>
  | ((args: RouteHeadersArgs<TParams>) => Promise<Record<string, string>> | Record<string, string>);

/**
 * App middleware signature: (request, context, next) => Response | void.
 * Return a Response to short-circuit, call/return next() to continue the
 * chain, or return undefined to pass to the next middleware.
 */
export type FrostMiddleware = (
  request: Request,
  context: FrostRequestContext,
  next: () => Promise<Response | void>,
) => Response | void | Promise<Response | void>;

export interface RouteModule {
  default?: RouteComponent;
  loader?: RouteLoader;
  action?: RouteAction;
  metadata?: RouteMetadata;
  /** Static or per-request response headers applied to page responses. */
  headers?: RouteHeaders;
  /** Middleware chain (used by app/_middleware modules). */
  middleware?: FrostMiddleware | FrostMiddleware[];
  /** Runtime contract: params/search/loader/action/headers schemas. */
  contract?: import("./contracts.js").RouteContract;
}

export interface ApiRouteModule {
  /** Runtime contract for params/search validation. */
  contract?: import("./contracts.js").RouteContract;
  GET?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  POST?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  PUT?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  DELETE?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  PATCH?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  HEAD?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  OPTIONS?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
}
