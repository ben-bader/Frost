import type { ComponentType, ReactNode } from "react";
import type { FrostRequestContext } from "./types.js";
import type { RouteContract } from "./contracts.js";
import type { RouteMetadata, RouteHeaders } from "./types.js";

export interface RouteLoaderArgs<Params = Record<string, string>> {
  request: Request;
  params: Params;
  url: URL;
  context: FrostRequestContext;
}

export type RouteActionArgs<Params = Record<string, string>> = RouteLoaderArgs<Params>;

export interface RouteComponentProps<
  Data = unknown,
  Params = Record<string, string>,
  ActionData = unknown,
> {
  data: Data;
  params: Params;
  actionData?: ActionData;
  children?: ReactNode;
}

/**
 * Define a Frost page route with full type inference.
 *
 * Loader return type flows into the component's `data` prop; action
 * return type flows into `actionData`; dynamic segment names type
 * `params` when the loader annotates them (or via the contract).
 *
 * ```ts
 * export default defineRoute({
 *   loader: async ({ params }) => ({ id: params.id }),
 *   default: ({ data }) => <p>{data.id}</p>,
 * });
 * ```
 */
export function defineRoute<
  Params extends Record<string, string> = Record<string, string>,
  LoaderData = unknown,
  ActionData = unknown,
>(route: {
  loader?: (args: RouteLoaderArgs<Params>) => LoaderData | Promise<LoaderData>;
  action?: (args: RouteActionArgs<Params>) => ActionData | Promise<ActionData>;
  default?: ComponentType<RouteComponentProps<LoaderData, Params, ActionData>>;
  metadata?: RouteMetadata<LoaderData, Params>;
  headers?: RouteHeaders<Params>;
  contract?: RouteContract;
  errorBoundary?: ComponentType<{
    error: Error;
    data: unknown;
    params: Params;
  }>;
  notFound?: ComponentType<{ params: Params }>;
  [key: string]: unknown;
}): typeof route {
  return route;
}
