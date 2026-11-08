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
import { renderRouteToHtml, renderSimpleDocument } from "./ssr.js";
import { dispatchApiRoute } from "./api.js";
import { applySecurityHeaders } from "./security.js";
import { json } from "./response.js";
import { validateCsrf } from "@frostjs/data";
import { dispatchServerFn } from "./server-fn.js";
import { runRouteLoaders } from "./ssr.js";
import { randomBytes } from "node:crypto";
import {
  createErrorReport,
  FROST_ERROR_CODES,
  type FrostErrorReport,
  type FrostLogger,
  type FrostMiddleware,
  logRequest,
  validateContractValue,
  formatContractIssues,
  searchParamsToObject,
  formDataToObject,
  createContractError,
  type RouteContract,
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
  /** html lang attribute for rendered documents. */
  lang?: string;
  /** Leveled logger; enables request logging when logRequests is set. */
  logger?: FrostLogger;
  /** Log one line per request (method, path, status, ms). */
  logRequests?: boolean;
  /** Validate route contracts (params/search/loader/action/headers). */
  validateContracts?: boolean;
  /** URL prefix for createServerFn RPC (default "/_frost/fn"). */
  serverFnPath?: string;
  /** Opt-in client router: emits route manifest + data endpoint. */
  routerEnabled?: boolean;
  /** Prefetch strategy embedded in the route manifest. */
  routerPrefetch?: "intent" | "viewport" | "none";
  /** Stream SSR documents with Suspense support (config.ssr.streaming). */
  ssrStreaming?: boolean;
}

const PAGE_METHODS = ["GET", "HEAD"];
const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

function methodNotAllowed(allow: string[]): Response {
  return json(
    { error: "Method Not Allowed", allowedMethods: allow },
    { status: 405, headers: { Allow: allow.join(", ") } },
  );
}

export function createRequestHandler(options: RequestHandlerOptions) {
  const {
    routes,
    loadModule,
    getAssetsForRoute,
    security,
    onError,
    checkDeterminism,
    lang,
    logger,
    logRequests,
    validateContracts,
    serverFnPath = "/_frost/fn",
    routerEnabled,
    routerPrefetch = "intent",
    ssrStreaming,
  } = options;

  // The global not-found route (app/not-found.tsx or app/_404.tsx) is
  // discovered with kind "not-found" and never participates in matching.
  const notFoundRoute = routes.find((r) => r.kind === "not-found");
  // App-root middleware (app/_middleware.ts(x) or app/middleware.ts(x)).
  const middlewareRoute = routes.find((r) => r.kind === "middleware");

  const loadLayoutModules = async (layoutPaths: string[] | undefined): Promise<RouteModule[]> => {
    if (!layoutPaths || layoutPaths.length === 0) return [];
    // Load all layout modules in parallel; a failing layout is skipped
    // with a warning.
    const results = await Promise.all(
      layoutPaths.map(async (layoutPath) => {
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
      }),
    );
    return results.filter((m): m is RouteModule => m !== null);
  };

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

  /** Validates contract.params and contract.search; returns an issue
   *  description or null. */
  const paramsSearchContractError = (
    contract: RouteContract | undefined,
    params: Record<string, string>,
    url: URL,
  ): string | null => {
    if (!validateContracts || !contract) return null;
    if (contract.params) {
      const r = validateContractValue(contract.params, params);
      if (!r.ok) return `params: ${formatContractIssues(r.issues)}`;
    }
    if (contract.search) {
      const r = validateContractValue(contract.search, searchParamsToObject(url.searchParams));
      if (!r.ok) return `search: ${formatContractIssues(r.issues)}`;
    }
    return null;
  };

  // Client-router manifest: route id -> pattern + asset URLs, computed
  // once and shared by every SSR'd document when the router is enabled.
  let routeManifestCache: Promise<unknown> | null = null;
  const getRouteManifest = (): Promise<unknown> => {
    if (!routeManifestCache) {
      routeManifestCache = (async () => {
        const entries = [];
        for (const r of routes.filter((x) => x.kind === "page")) {
          try {
            const assets = await getAssetsForRoute?.(r);
            entries.push({
              id: r.id,
              pattern: r.pattern,
              isDynamic: r.isDynamic,
              scripts: assets?.scripts ?? [],
              css: assets?.css ?? [],
            });
          } catch {
            entries.push({
              id: r.id,
              pattern: r.pattern,
              isDynamic: r.isDynamic,
              scripts: [],
              css: [],
            });
          }
        }
        return { prefetch: routerPrefetch, routes: entries };
      })();
    }
    return routeManifestCache;
  };

  /** Parses an action request body into a plain object for contract
   *  validation. Returns undefined when the body can't be parsed. */
  const parseActionInput = async (request: Request): Promise<unknown> => {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        return await request.clone().json();
      }
      if (
        contentType.includes("multipart/form-data") ||
        contentType.includes("application/x-www-form-urlencoded")
      ) {
        return formDataToObject(await request.clone().formData());
      }
    } catch {
      // Unparseable body — skip contract validation, let the action decide.
    }
    return undefined;
  };

  const handleRequest = async (
    request: Request,
    contextOverrides?: Partial<FrostRequestContext>,
  ): Promise<Response> => {
    const url = new URL(request.url);

    // Decode percent-escapes per segment so %70-style escapes match routes,
    // while %2F stays inside its segment. Malformed escapes -> 400.
    const decodedPath = decodePathname(url.pathname);
    if (decodedPath === null) {
      const res = json(
        { error: "Bad Request", message: "Malformed percent-encoding in URL" },
        { status: 400 },
      );
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

    // The full routing pipeline (API -> page -> 404). Wrapped so
    // middleware's next() can delegate to it.
    const routeRequest = async (): Promise<Response> => {
      let response: Response;

      // 0a. Server-function RPC endpoint: POST /<serverFnPath>/<id>.
      const fnPrefix = `${serverFnPath}/`;
      if (pathname.startsWith(fnPrefix)) {
        const fnId = decodeURIComponent(pathname.slice(fnPrefix.length));
        const fnResponse = await dispatchServerFn(request, fnId, context, { onError });
        applySecurityHeaders(fnResponse.headers, secOptions);
        return fnResponse;
      }

      // 1. Try API routes first
      const apiMatch = matchRoutes(apiRoutes, pathname);
      if (apiMatch) {
        try {
          const mod = (await loadModule(apiMatch.route)) as ApiRouteModule;
          const contractIssue = paramsSearchContractError(mod.contract, apiMatch.params, url);
          if (contractIssue) {
            onError?.(
              createErrorReport(
                createContractError("params/search", [{ message: contractIssue }]),
                { runtime: "server", route: pathname },
              ),
            );
            response = json(
              { error: "Bad Request", message: `Contract violation: ${contractIssue}` },
              { status: 400 },
            );
            applySecurityHeaders(response.headers, secOptions);
            return response;
          }
          response = await dispatchApiRoute(mod, request, context, onError);
        } catch (err) {
          console.error(`[Frost] Error in API route ${pathname}:`, err);
          onError?.(
            createErrorReport(err, {
              runtime: "server",
              route: pathname,
              code: FROST_ERROR_CODES.API,
            }),
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

            const contractIssue = paramsSearchContractError(mod.contract, pageMatch.params, url);
            if (contractIssue) {
              onError?.(
                createErrorReport(
                  createContractError("params/search", [{ message: contractIssue }]),
                  { runtime: "server", route: pathname },
                ),
              );
              response = renderSimpleDocument({
                title: "Bad Request",
                heading: "Invalid request",
                detail: `Contract violation: ${contractIssue}`,
                status: 400,
                lang,
                context,
              });
              applySecurityHeaders(response.headers, secOptions);
              return response;
            }

            // Layout modules are needed for the method gate, actions, and rendering.
            const layoutModules = await loadLayoutModules(pageMatch.route.layouts);

            // Method gate: pages allow GET/HEAD, plus mutations when the
            // route or one of its layouts exports an action.
            const hasAction = !!mod.action || layoutModules.some((l) => !!l.action);
            const allowed = hasAction ? [...PAGE_METHODS, ...MUTATION_METHODS] : PAGE_METHODS;
            if (!allowed.includes(request.method.toUpperCase())) {
              response = methodNotAllowed(allowed);
              applySecurityHeaders(response.headers, secOptions);
              return response;
            }

            // Client-router data endpoint: GET <path>?__frost_data=1 returns
            // the route's loader data as JSON instead of HTML.
            if (routerEnabled && request.method === "GET" && url.searchParams.has("__frost_data")) {
              const settled = await runRouteLoaders({
                routeModule: mod,
                layoutModules,
                params: pageMatch.params,
                request,
                url,
                context,
                validateContracts,
              });
              const routeSettled = settled[0];
              if (routeSettled?.status === "ok" && routeSettled.value instanceof Response) {
                applySecurityHeaders(routeSettled.value.headers, secOptions);
                return routeSettled.value;
              }
              const loaderFailure = settled.find((s) => s.status === "err");
              if (loaderFailure && loaderFailure.status === "err") {
                onError?.(
                  createErrorReport(loaderFailure.error, {
                    runtime: "server",
                    route: pathname,
                    code: FROST_ERROR_CODES.LOADER,
                  }),
                );
                response = json(
                  {
                    error: {
                      code: FROST_ERROR_CODES.LOADER,
                      message:
                        loaderFailure.error instanceof Error
                          ? loaderFailure.error.message
                          : "Loader failed",
                    },
                  },
                  { status: 500 },
                );
                applySecurityHeaders(response.headers, secOptions);
                return response;
              }
              const loaderData = routeSettled?.status === "ok" ? routeSettled.value : null;
              const layoutData = layoutModules.map((_, i) => {
                const s = settled[i + 1];
                return s && s.status === "ok" ? s.value : undefined;
              });
              response = json({
                routeId: pageMatch.route.id,
                pathname,
                params: pageMatch.params,
                loaderData,
                layoutData,
              });
              response.headers.set("Cache-Control", "no-store");
              applySecurityHeaders(response.headers, secOptions);
              return response;
            }

            // Handle page route actions on mutation methods (POST, PUT, DELETE, PATCH).
            // The page's own action wins; otherwise the nearest layout action
            // (leaf -> root) handles the mutation.
            if (request.method !== "GET" && request.method !== "HEAD" && hasAction) {
              try {
                validateCsrf(request);
              } catch (csrfErr) {
                onError?.(
                  createErrorReport(csrfErr, {
                    runtime: "server",
                    route: pathname,
                    code: FROST_ERROR_CODES.MIDDLEWARE,
                  }),
                );
                response = json(
                  { error: "Forbidden", message: "CSRF validation failed" },
                  { status: 403 },
                );
                applySecurityHeaders(response.headers, secOptions);
                return response;
              }

              const actionOwner = mod.action
                ? mod
                : [...layoutModules].reverse().find((l) => l.action);

              // contract.action validates the parsed request input
              // (JSON body or form fields). The page contract wins; a
              // layout action falls back to its own contract.
              const actionContract = mod.contract?.action ? mod.contract : actionOwner?.contract;
              if (validateContracts && actionContract?.action) {
                const input = await parseActionInput(request);
                if (input !== undefined) {
                  const v = validateContractValue(actionContract.action, input);
                  if (!v.ok) {
                    const err = createContractError("action", v.issues);
                    onError?.(
                      createErrorReport(err, {
                        runtime: "server",
                        route: pathname,
                      }),
                    );
                    response = json(
                      { error: "Bad Request", message: err.message },
                      { status: 400 },
                    );
                    applySecurityHeaders(response.headers, secOptions);
                    return response;
                  }
                }
              }

              let actionResult: unknown;
              try {
                actionResult = await actionOwner!.action!({
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
                  }),
                );
                (actionErr as Record<string, unknown>)["__frostReported"] = true;
                throw actionErr;
              }
              if (actionResult instanceof Response) {
                applySecurityHeaders(actionResult.headers, secOptions);
                return actionResult;
              }
              // Progressive enhancement: a plain <form method="post"> sends
              // Accept: text/html — re-render the page with actionData so it
              // works without client JS. Fetch/XHR clients get JSON.
              const acceptsHtml = request.headers.get("accept")?.includes("text/html");
              if (acceptsHtml) {
                const assets = await getAssetsForRoute?.(pageMatch.route);
                response = await renderRouteToHtml({
                  routeModule: mod,
                  layoutModules,
                  params: pageMatch.params,
                  pathname,
                  request,
                  context,
                  assets,
                  actionData: actionResult,
                  errorBoundaryModule: pageMatch.route.errorBoundary
                    ? ((await loadModule({
                        id: pageMatch.route.errorBoundary,
                        pattern: "",
                        filePath: pageMatch.route.errorBoundary,
                        kind: "layout",
                        isDynamic: false,
                        isCatchAll: false,
                        score: 0,
                      })) as RouteModule)
                    : undefined,
                  lang,
                  onError,
                  checkDeterminism,
                  validateContracts,
                  routeId: pageMatch.route.id,
                  routeManifest: routerEnabled ? await getRouteManifest() : undefined,
                  streaming: ssrStreaming,
                });
              } else {
                response = json(actionResult);
              }
              applySecurityHeaders(response.headers, secOptions);
              return response;
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
              errorBoundaryModule: pageMatch.route.errorBoundary
                ? ((await loadModule({
                    id: pageMatch.route.errorBoundary,
                    pattern: "",
                    filePath: pageMatch.route.errorBoundary,
                    kind: "layout",
                    isDynamic: false,
                    isCatchAll: false,
                    score: 0,
                  })) as RouteModule)
                : undefined,
              lang,
              onError,
              checkDeterminism,
              validateContracts,
              routeId: pageMatch.route.id,
              routeManifest: routerEnabled ? await getRouteManifest() : undefined,
              streaming: ssrStreaming,
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
              if (validateContracts && mod.contract?.headers) {
                const v = validateContractValue(mod.contract.headers, routeHeaders);
                if (!v.ok) {
                  throw createContractError("headers", v.issues);
                }
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
                }),
              );
            }
            response = renderSimpleDocument({
              title: "Server Error",
              heading: "Something went wrong",
              detail: err instanceof Error ? err.message : "Unknown error",
              status: 500,
              lang,
              context,
            });
          }
        } else {
          // 3. 404 Not Found — render app/not-found.tsx (or _404.tsx) inside
          // the root layout when present, else a minimal styled document.
          if (notFoundRoute) {
            try {
              const mod = (await loadModule(notFoundRoute)) as RouteModule;
              const layoutModules = await loadLayoutModules(notFoundRoute.layouts);
              const assets = await getAssetsForRoute?.(notFoundRoute);
              response = await renderRouteToHtml({
                routeModule: mod,
                layoutModules,
                params: {},
                pathname,
                request,
                context,
                assets,
                status: 404,
                lang,
                onError,
                checkDeterminism,
                validateContracts,
                routeId: "not-found",
                routeManifest: routerEnabled ? await getRouteManifest() : undefined,
                streaming: ssrStreaming,
              });
            } catch (nfErr) {
              console.error(`[Frost] Error rendering not-found route:`, nfErr);
              response = renderSimpleDocument({
                title: "404 Not Found",
                heading: "404 Not Found",
                detail: `No route matched URL: ${pathname}`,
                status: 404,
                lang,
                context,
              });
            }
          } else {
            response = renderSimpleDocument({
              title: "404 Not Found",
              heading: "404 Not Found",
              detail: `No route matched URL: ${pathname}`,
              status: 404,
              lang,
              context,
            });
          }
        }
      }

      applySecurityHeaders(response.headers, secOptions);
      return response;
    };

    // 0. Middleware chain (app/_middleware.ts or app/middleware.ts) runs
    //    before routing for pages and APIs. Each middleware receives
    //    (request, context, next); returning a Response short-circuits,
    //    returning undefined continues the chain, and next() delegates to
    //    the remaining middlewares then the router.
    if (middlewareRoute) {
      try {
        const mwMod = (await loadModule(middlewareRoute)) as {
          default?: unknown;
          middleware?: unknown;
        };
        const candidates = Array.isArray(mwMod?.middleware)
          ? mwMod.middleware
          : [mwMod?.middleware ?? mwMod?.default];
        const fns = candidates.filter((f): f is FrostMiddleware => typeof f === "function");
        if (fns.length > 0) {
          const dispatch = async (index: number): Promise<Response | void> => {
            if (index >= fns.length) return routeRequest();
            // Memoize next() so a middleware that calls next() and then
            // returns undefined reuses the same downstream response
            // instead of re-running the entire routing pipeline.
            let downstream: Promise<Response | void> | undefined;
            const next = () => (downstream ??= dispatch(index + 1));
            const result = await fns[index]!(request, context, next);
            return result === undefined ? next() : result;
          };
          const mwResult = await dispatch(0);
          const response = mwResult instanceof Response ? mwResult : await routeRequest();
          applySecurityHeaders(response.headers, secOptions);
          return response;
        }
      } catch (err) {
        onError?.(
          createErrorReport(err, {
            runtime: "server",
            route: pathname,
            code: FROST_ERROR_CODES.MIDDLEWARE,
          }),
        );
        return renderSimpleDocument({
          title: "Server Error",
          heading: "Something went wrong",
          detail: err instanceof Error ? err.message : "Middleware error",
          status: 500,
          lang,
          context,
        });
      }
    }

    return routeRequest();
  };

  if (!logRequests || !logger) return handleRequest;
  return async (request: Request, contextOverrides?: Partial<FrostRequestContext>) => {
    const start = performance.now();
    const response = await handleRequest(request, contextOverrides);
    let path = request.url;
    try {
      path = new URL(request.url).pathname;
    } catch {
      // keep raw url
    }
    logRequest(logger, {
      method: request.method,
      path,
      status: response.status,
      ms: Math.round(performance.now() - start),
    });
    return response;
  };
}
