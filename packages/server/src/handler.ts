import {
  type DiscoveredRoute,
  type CompiledRoute,
  compilePattern,
  matchRoutes,
  normalizePathname,
  decodePathname,
} from "@frostjs/router";
import {
  createRequestContext,
  type FrostRequestContext,
  type FrostAssets,
  type RouteModule,
  type ApiRouteModule,
  type ResolvedSecurityConfig,
} from "@frostjs/core";
import { renderRouteToHtml } from "./ssr.js";
import { dispatchApiRoute } from "./api.js";
import { applySecurityHeaders } from "./security.js";
import { html, json } from "./response.js";
import { randomBytes } from "node:crypto";
import {
  createErrorReport,
  FROST_ERROR_CODES,
  type FrostErrorReport,
} from "@frostjs/core";

export interface LoadedRoute<T = RouteModule | ApiRouteModule> {
  discovered: DiscoveredRoute;
  module: T;
}

export interface RequestHandlerOptions {
  routes: DiscoveredRoute[];
  loadModule: (route: DiscoveredRoute) => Promise<RouteModule | ApiRouteModule>;
  getAssetsForRoute?: (route: DiscoveredRoute) => FrostAssets | Promise<FrostAssets>;
  /** Resolved security config; enables CSP nonce + extra headers. */
  security?: ResolvedSecurityConfig;
  /** Dev hook: receives structured error reports for overlay/terminal. */
  onError?: (report: FrostErrorReport) => void;
  /** Dev-only: render twice and warn on nondeterministic output (F19). */
  checkDeterminism?: boolean;
}

const PAGE_METHODS = ["GET", "HEAD"];
const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

function methodNotAllowed(allow: string[]): Response {
  return json(
    { error: "Method Not Allowed", allowedMethods: allow },
    { status: 405, headers: { Allow: allow.join(", ") } }
  );
}

export function createRequestHandler(options: RequestHandlerOptions) {
  const { routes, loadModule, getAssetsForRoute, security, onError, checkDeterminism } = options;

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

    // Decode percent-escapes per segment so %70-style escapes match routes,
    // while %2F stays inside its segment. Malformed escapes -> 400.
    const decodedPath = decodePathname(url.pathname);
    if (decodedPath === null) {
      const res = json({ error: "Bad Request", message: "Malformed percent-encoding in URL" }, { status: 400 });
      applySecurityHeaders(res.headers, { security });
      return res;
    }
    const pathname = normalizePathname(decodedPath);

    const cspNonce = security?.csp ? generateNonce() : undefined;
    const context = createRequestContext(request, {
      ...contextOverrides,
      cspNonce: contextOverrides?.cspNonce ?? cspNonce,
    });
    const secOptions = { security, nonce: context.cspNonce };

    let response: Response;

    // 1. Try API routes first
    const apiMatch = matchRoutes(apiRoutes, pathname);
    if (apiMatch) {
      try {
        const mod = (await loadModule(apiMatch.route)) as ApiRouteModule;
        response = await dispatchApiRoute(mod, request, context, onError);
      } catch (err) {
        console.error(`[Frost] Error in API route ${pathname}:`, err);
        onError?.(
          createErrorReport(err, {
            runtime: "server",
            route: pathname,
            code: FROST_ERROR_CODES.API,
          })
        );
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

          // Method gate: pages allow GET/HEAD, plus mutations when the
          // route exports an action. Everything else -> 405.
          const allowed = mod.action
            ? [...PAGE_METHODS, ...MUTATION_METHODS]
            : PAGE_METHODS;
          if (!allowed.includes(request.method.toUpperCase())) {
            response = methodNotAllowed(allowed);
            applySecurityHeaders(response.headers, secOptions);
            return response;
          }

          // Handle page route actions on mutation methods (POST, PUT, DELETE, PATCH)
          if (request.method !== "GET" && request.method !== "HEAD" && mod.action) {
            let actionResult: unknown;
            try {
              actionResult = await mod.action({
                request,
                params: pageMatch.params,
                url,
                context,
              });
            } catch (actionErr) {
              onError?.(
                createErrorReport(actionErr, {
                  runtime: "server",
                  route: pathname,
                  code: FROST_ERROR_CODES.ACTION,
                })
              );
              (actionErr as Record<string, unknown>)["__frostReported"] = true;
              throw actionErr;
            }
            if (actionResult instanceof Response) {
              applySecurityHeaders(actionResult.headers, secOptions);
              return actionResult;
            }
            response = json(actionResult);
            applySecurityHeaders(response.headers, secOptions);
            return response;
          }

          const layoutModules: RouteModule[] = [];

          if (pageMatch.route.layouts && pageMatch.route.layouts.length > 0) {
            // Load all layout modules in parallel; a failing layout is
            // skipped with a warning (same semantics as before).
            const layoutResults = await Promise.all(
              pageMatch.route.layouts.map(async (layoutPath) => {
                try {
                  return (await loadModule({
                    id: layoutPath,
                    pattern: "",
                    filePath: layoutPath,
                    kind: "layout",
                    isDynamic: false,
                    isCatchAll: false,
                    score: 0,
                  })) as RouteModule;
                } catch (layoutErr) {
                  console.warn(`[Frost] Could not load layout at ${layoutPath}:`, layoutErr);
                  return null;
                }
              })
            );
            for (const layoutMod of layoutResults) {
              if (layoutMod) layoutModules.push(layoutMod);
            }
          }

          const assets = await getAssetsForRoute?.(pageMatch.route);
          response = await renderRouteToHtml({
            routeModule: mod,
            layoutModules,
            params: pageMatch.params,
            pathname,
            request,
            context,
            assets,
            onError,
            checkDeterminism,
          });

          // Per-route headers export (static map or function).
          if (mod.headers) {
            const routeHeaders =
              typeof mod.headers === "function"
                ? await mod.headers({ request, params: pageMatch.params, url, context })
                : mod.headers;
            for (const [key, value] of Object.entries(routeHeaders)) {
              response.headers.set(key, value);
            }
          }

          // HTML must always revalidate — it embeds per-request state.
          if (
            response.headers.get("Content-Type")?.includes("text/html") &&
            !response.headers.has("Cache-Control")
          ) {
            response.headers.set("Cache-Control", "no-cache");
          }
        } catch (err) {
          console.error(`[Frost] Error rendering route ${pathname}:`, err);
          if (!(err as Record<string, unknown>)?.["__frostReported"]) {
            onError?.(
              createErrorReport(err, {
                runtime: "server",
                route: pathname,
                code: FROST_ERROR_CODES.RENDER,
              })
            );
          }
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

    applySecurityHeaders(response.headers, secOptions);
    return response;
  };
}
