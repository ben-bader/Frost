import type { ReactNode } from "react";

export type RenderingMode = "static" | "server" | "incremental" | "client";

export interface RenderingConfig {
  mode: RenderingMode;
  revalidateSeconds?: number;
  cacheTags?: string[];
}

export interface FrostRequestContext {
  readonly requestId: string;
  readonly startTime: number;
  readonly memo: Map<string, unknown>;
  readonly clientIp?: string;
  readonly userAgent?: string;
}

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
  }

  export interface MetadataArgs<TData = any, TParams = Record<string, string>> {
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
    meta?: Array<Record<string, string>>;
    links?: Array<Record<string, string>>;
  }
}

export type RouteLoader<TData = any, TParams = Record<string, string>> = (
  args: Route.LoaderArgs<TParams>
) => Promise<TData | Response> | TData | Response;

export type RouteAction<TResult = any, TParams = Record<string, string>> = (
  args: Route.ActionArgs<TParams>
) => Promise<TResult | Response> | TResult | Response;

export type RouteComponent<TData = any, TParams = Record<string, string>> = (
  props: Route.ComponentProps<TData, TParams>
) => ReactNode;

export type RouteMetadata<TData = any, TParams = Record<string, string>> =
  | Route.Metadata
  | ((args: Route.MetadataArgs<TData, TParams>) => Promise<Route.Metadata> | Route.Metadata);

export interface RouteModule {
  default?: RouteComponent;
  loader?: RouteLoader;
  action?: RouteAction;
  metadata?: RouteMetadata;
  rendering?: RenderingConfig;
}

export interface ApiRouteModule {
  GET?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  POST?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  PUT?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  DELETE?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  PATCH?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  HEAD?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
  OPTIONS?: (request: Request, context: FrostRequestContext) => Promise<Response> | Response;
}

