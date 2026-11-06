import {
  type DiscoveredRoute,
  type CompiledRoute,
  compilePattern,
  matchRoutes,
  normalizePathname,
} from "@frostjs/router";
import {
  createRequestContext,
  type FrostRequestContext,
  type RouteModule,
  type ApiRouteModule,
} from "@frostjs/core";
import { renderRouteToHtml } from "./ssr.js";
import { dispatchApiRoute } from "./api.js";
import { applySecurityHeaders } from "./security.js";
import { html } from "./response.js";

export interface LoadedRoute<T = RouteModule | ApiRouteModule> {
  discovered: DiscoveredRoute;
  module: T;
}

export interface RequestHandlerOptions {
  routes: DiscoveredRoute[];
  loadModule: (route: DiscoveredRoute) => Promise<RouteModule | ApiRouteModule>;
  getAssetsForRoute?: (route: DiscoveredRoute) => { scripts: string[]; css: string[] };
}

export function createRequestHandler(options: RequestHandlerOptions) {
  const { routes, loadModule, getAssetsForRoute } = options;

  // Separate and compile API vs Page routes
  const apiRoutes: CompiledRoute<DiscoveredRoute>[] = [];
  const pageRoutes: CompiledRoute<DiscoveredRoute>[] = [];

  for (const route of routes) {
    const compiled = compilePattern(route, route.pattern);
    if (route.kind === "api") {
      apiRoutes.push(compiled);
    } else if (route.kind === "page") {
      pageRoutes.push(compiled);
    }
  }

  return async function handleRequest(
    request: Request,
    contextOverrides?: Partial<FrostRequestContext>
  ): Promise<Response> {
    const url = new URL(request.url);
    const pathname = normalizePathname(url.pathname);
    const context = createRequestContext(request, contextOverrides);

    let response: Response;

    // 1. Try API routes first
    const apiMatch = matchRoutes(apiRoutes, pathname);
    if (apiMatch) {
      try {
        const mod = (await loadModule(apiMatch.route)) as ApiRouteModule;
        response = await dispatchApiRoute(mod, request, context);
      } catch (err) {
        console.error(`[Frost] Error in API route ${pathname}:`, err);
        response = new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      // 2. Try Page routes
      const pageMatch = matchRoutes(pageRoutes, pathname);
      if (pageMatch) {
        try {
          const mod = (await loadModule(pageMatch.route)) as RouteModule;
          const assets = getAssetsForRoute?.(pageMatch.route);
          response = await renderRouteToHtml({
            routeModule: mod,
            params: pageMatch.params,
            pathname,
            request,
            context,
            assets,
          });
        } catch (err) {
          console.error(`[Frost] Error rendering route ${pathname}:`, err);
          response = html(
            `<!DOCTYPE html><html><head><title>500 Internal Server Error</title></head><body><h1>Server Error</h1><p>${
              err instanceof Error ? err.message : "Unknown error"
            }</p></body></html>`,
            { status: 500 }
          );
        }
      } else {
        // 3. 404 Not Found
        response = html(
          `<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>No route matched URL: ${pathname}</p></body></html>`,
          { status: 404 }
        );
      }
    }

    applySecurityHeaders(response.headers);
    return response;
  };
}

