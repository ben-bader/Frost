import { createRequestHandler, type RequestHandlerOptions } from "@frostjs/server";
import { renderRouteToHtml } from "@frostjs/server";
import type { DiscoveredRoute } from "@frostjs/router";
import type { FrostRequestContext, RouteModule, ApiRouteModule } from "@frostjs/core";
import { createRequestContext } from "@frostjs/core";

export interface TestHandlerOptions extends Omit<RequestHandlerOptions, "routes" | "loadModule"> {
  routes?: DiscoveredRoute[];
  /** Modules keyed by route filePath (or route.id). */
  modules?: Record<string, RouteModule | ApiRouteModule>;
}

function routeKey(route: DiscoveredRoute): string {
  return route.filePath;
}

/**
 * Build a request handler backed by in-memory route modules — no
 * filesystem or Vite required. Pass `routes` discovered via
 * discoverRoutes() or hand-written DiscoveredRoute objects.
 */
export function createTestHandler(options: TestHandlerOptions) {
  const { routes = [], modules = {}, ...rest } = options;
  return createRequestHandler({
    routes,
    ...rest,
    loadModule: async (route) => {
      const mod = modules[routeKey(route)] ?? modules[route.id];
      if (!mod) throw new Error(`No test module registered for ${routeKey(route)}`);
      return mod as RouteModule;
    },
  });
}

export interface RenderRouteOptions {
  request?: Request;
  params?: Record<string, string>;
  context?: Partial<FrostRequestContext>;
  pathname?: string;
}

/** Render a page route module to an HTML Response (loaders run). */
export async function renderRoute(
  routeModule: RouteModule,
  options: RenderRouteOptions = {},
): Promise<Response> {
  const request = options.request ?? new Request(`http://localhost${options.pathname ?? "/"}`);
  const url = new URL(request.url);
  const context = createRequestContext(request, options.context);
  return renderRouteToHtml({
    routeModule,
    params: options.params ?? {},
    pathname: url.pathname,
    request,
    context,
    lang: "en",
  });
}

/** Call a route loader directly with a mock request. */
export async function callLoader(
  routeModule: RouteModule,
  options: RenderRouteOptions = {},
): Promise<unknown> {
  if (!routeModule.loader) {
    throw new Error("Route module does not export a loader");
  }
  const request = options.request ?? new Request(`http://localhost${options.pathname ?? "/"}`);
  const context = createRequestContext(request, options.context);
  return routeModule.loader({
    request,
    params: options.params ?? {},
    url: new URL(request.url),
    context,
  });
}

/** Call a route action directly with a mock request. */
export async function callAction(
  routeModule: RouteModule,
  options: RenderRouteOptions = {},
): Promise<unknown> {
  if (!routeModule.action) {
    throw new Error("Route module does not export an action");
  }
  const request =
    options.request ??
    new Request(`http://localhost${options.pathname ?? "/"}`, { method: "POST" });
  const context = createRequestContext(request, options.context);
  return routeModule.action({
    request,
    params: options.params ?? {},
    url: new URL(request.url),
    context,
  });
}
