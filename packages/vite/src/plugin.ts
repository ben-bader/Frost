import type { Plugin, ViteDevServer } from "vite";
import type { EnvironmentModuleNode } from "vite";
import * as path from "node:path";
import { resolveConfig, type FrostConfig } from "@frostjs/core";
import { discoverRoutes, type DiscoveredRoute } from "@frostjs/router";
import { createRequestHandler } from "@frostjs/server";
import { isSafeRequestTarget, nodeReqToWebRequest, sendWebResponseToNode } from "@frostjs/adapter-node";
import { setBodyLimits } from "@frostjs/data";
import {
  VIRTUAL_ROUTES_ID,
  RESOLVED_VIRTUAL_ROUTES_ID,
  generateRoutesModuleCode,
  generateClientEntryCode,
} from "./virtual.js";
import { validateClientEnvAccess, validateModuleBoundary } from "./boundary.js";

export function frost(userConfig: FrostConfig = {}): Plugin {
  const config = resolveConfig(userConfig);
  setBodyLimits(config.limits);
  let rootDir: string;
  let isClientBuild = true;
  let cachedRoutes: DiscoveredRoute[] = [];

  // Dev request caches: route discovery and the per-route CSS graph are
  // expensive (recursive fs scan + module-graph walk), so they are
  // computed once and invalidated by watcher events instead of per request.
  let devRoutesCache: DiscoveredRoute[] | null = null;
  const devCssCache = new Map<string, string[]>();
  let routesInvalidationTimer: ReturnType<typeof setTimeout> | null = null;
  let cssInvalidationTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRouteInvalidation = () => {
    if (routesInvalidationTimer) clearTimeout(routesInvalidationTimer);
    // Debounce ~50ms to coalesce atomic-save bursts into one invalidation.
    routesInvalidationTimer = setTimeout(() => {
      routesInvalidationTimer = null;
      devRoutesCache = null;
    }, 50);
  };

  const scheduleCssInvalidation = () => {
    if (cssInvalidationTimer) clearTimeout(cssInvalidationTimer);
    cssInvalidationTimer = setTimeout(() => {
      cssInvalidationTimer = null;
      devCssCache.clear();
    }, 50);
  };

  const isInsideDir = (dir: string, file: string): boolean => {
    const rel = path.relative(dir, file);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  };

  const getDevRoutes = (): DiscoveredRoute[] => {
    if (!devRoutesCache) {
      devRoutesCache = discoverRoutes({
        appDirectory: config.appDirectory,
        apiDirectory: config.apiDirectory,
        rootDir,
      });
    }
    return devRoutesCache;
  };

  return {
    name: "frost:vite-plugin",
    enforce: "pre",

    config() {
      return {
        appType: "custom",
        server: {
          watch: {
            // Reliable defaults on Windows; polling stays opt-in via
            // dev.watch.usePolling for network drives / WSL edge cases.
            usePolling: config.dev.watch.usePolling,
            interval: config.dev.watch.interval,
            ignored: [
              "**/node_modules/**",
              "**/.git/**",
              "**/.frost/**",
              "**/dist/**",
            ],
          },
        },
      };
    },

    configResolved(resolvedViteConfig) {
      rootDir = resolvedViteConfig.root;
      isClientBuild = !resolvedViteConfig.build.ssr;
      cachedRoutes = discoverRoutes({
        appDirectory: config.appDirectory,
        apiDirectory: config.apiDirectory,
        rootDir,
      });
    },

    resolveId(id, importer, options) {
      // 1. Boundary enforcement — only for client-side resolution. In dev
      //    the same plugin serves both environments; SSR transforms pass
      //    ssr: true and must be allowed to import .server modules.
      validateModuleBoundary(id, importer, isClientBuild && options?.ssr !== true);

      // 2. Virtual route module
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_VIRTUAL_ROUTES_ID;
      }
      if (id.startsWith("/@frost/client") || id.startsWith("@frost/client")) {
        return id;
      }
      return null;
    },

    transform(code, id, options) {
      // Client-bound app code must not read server env vars. Skip
      // dependencies (pre-bundled or not) and SSR transforms.
      if (
        isClientBuild &&
        options?.ssr !== true &&
        !id.includes("node_modules") &&
        !id.startsWith("\\0") &&
        !id.startsWith("/virtual:") &&
        /\.[jt]sx?$/.test(id.split("?")[0] ?? id)
      ) {
        validateClientEnvAccess(code, id);
      }
      return null;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ROUTES_ID) {
        cachedRoutes = discoverRoutes({
          appDirectory: config.appDirectory,
          apiDirectory: config.apiDirectory,
          rootDir,
        });
        return generateRoutesModuleCode(cachedRoutes);
      }
      if (id.startsWith("/@frost/client") || id.startsWith("@frost/client")) {
        const queryIndex = id.indexOf("?");
        if (queryIndex !== -1) {
          const searchParams = new URLSearchParams(id.slice(queryIndex));
          const file = searchParams.get("file");
          const layoutsRaw = searchParams.get("layouts");
          let layouts: string[] = [];
          if (layoutsRaw) {
            try {
              layouts = JSON.parse(layoutsRaw);
            } catch {
              layouts = [];
            }
          }
          if (file) {
            return generateClientEntryCode(file, layouts, rootDir);
          }
        }
      }
      return null;
    },

    configureServer(server: ViteDevServer) {
      // Watcher is the single source of change events. Route-table changes
      // are scoped to the app/api directories; the CSS graph cache is
      // cleared for any in-project change since imports can live anywhere.
      const appDir = path.resolve(rootDir, config.appDirectory);
      const apiDir = path.resolve(rootDir, config.apiDirectory);
      server.watcher.on("all", (event, file) => {
        if (event !== "change" && event !== "add" && event !== "unlink") return;
        const abs = path.resolve(file);
        if (isInsideDir(appDir, abs) || isInsideDir(apiDir, abs)) {
          scheduleRouteInvalidation();
        }
        scheduleCssInvalidation();
      });

      // Pre-middleware (runs before Vite's internal middlewares): serves
      // compiled route stylesheets as text/css so the SSR document can
      // reference them with a real render-blocking <link> instead of
      // waiting for client-side JS injection after hydration.
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/@frost/css")) {
          void serveDevStylesheet(server, req, res);
          return;
        }
        next();
      });

      // Return middleware that executes after Vite's internal static asset middleware
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url) return next();

          // Skip Vite internal URLs (@vite, @fs, node_modules, etc.)
          if (
            req.url.startsWith("/@") ||
            req.url.startsWith("/node_modules/") ||
            req.url.includes("?import")
          ) {
            return next();
          }

          // Vite's internal SPA middleware rewrites / to /index.html
          if (req.url === "/index.html" || req.url.startsWith("/index.html?")) {
            req.url = req.url.replace(/^\/index\.html/, "/") || "/";
          }

          if (!isSafeRequestTarget(req.url)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Bad Request");
            return;
          }

          try {
            // Cached route table — invalidated by watcher events in the
            // app/api directories (see configureServer above).
            const devRoutes = getDevRoutes();

            // Create request handler using Vite's ssrLoadModule
            const handler = createRequestHandler({
              routes: devRoutes,
              security: config.security,
              loadModule: async (route) => {
                return (await server.ssrLoadModule(route.filePath)) as any;
              },
              getAssetsForRoute: (route) => {
                if (route.kind === "page") {
                  const layoutsQuery =
                    route.layouts && route.layouts.length > 0
                      ? `&layouts=${encodeURIComponent(JSON.stringify(route.layouts))}`
                      : "";
                  const entryFiles = [route.filePath, ...(route.layouts ?? [])];
                  // CSS graph is cached per route and cleared on any
                  // in-project file change (module imports can move).
                  let cssUrls = devCssCache.get(route.id);
                  if (!cssUrls) {
                    cssUrls = collectRouteCss(server, entryFiles);
                    devCssCache.set(route.id, cssUrls);
                  }
                  return {
                    scripts: [
                      `/@frost/client?file=${encodeURIComponent(route.filePath)}${layoutsQuery}`,
                    ],
                    css: cssUrls.map(
                      (cssUrl) => `/@frost/css?url=${encodeURIComponent(cssUrl)}`
                    ),
                  };
                }
                return { scripts: [], css: [] };
              },
            });

            const webRequest = nodeReqToWebRequest(req);
            let webResponse = await handler(webRequest);

            // In Vite dev mode, transform the generated SSR HTML through Vite to inject HMR scripts
            if (
              webResponse.headers.get("Content-Type")?.includes("text/html") &&
              webResponse.status === 200
            ) {
              const originalHtml = await webResponse.text();
              const transformedHtml = await server.transformIndexHtml(req.url, originalHtml);
              webResponse = new Response(transformedHtml, {
                status: webResponse.status,
                headers: webResponse.headers,
              });
            }

            await sendWebResponseToNode(webResponse, res);
          } catch (err) {
            server.ssrFixStacktrace(err as Error);
            console.error("[Frost Dev Server Error]", err);
            next(err);
          }
        });
      };
    },
  };
}

const CSS_FILE_RE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/i;

/**
 * Walks the SSR module graph from the route entry files and returns the
 * served URLs of every stylesheet reachable through static imports.
 * CSS modules are leaf nodes: their `@import`ed stylesheets are already
 * inlined into the compiled CSS output by Vite/PostCSS.
 */
function collectRouteCss(server: ViteDevServer, entryFiles: string[]): string[] {
  const ssrGraph = server.environments?.ssr?.moduleGraph;
  if (!ssrGraph) {
    return [];
  }

  const cssUrls: string[] = [];
  const seenCss = new Set<string>();
  const seenModules = new Set<EnvironmentModuleNode>();

  const isCssModule = (mod: EnvironmentModuleNode): boolean => {
    if (mod.type === "css") return true;
    const urlPath = mod.url.split("?")[0] ?? mod.url;
    if (CSS_FILE_RE.test(urlPath)) return true;
    return mod.file ? CSS_FILE_RE.test(mod.file) : false;
  };

  const visitModule = (mod: EnvironmentModuleNode): void => {
    if (seenModules.has(mod)) return;
    seenModules.add(mod);

    if (isCssModule(mod)) {
      // Skip modules with query suffixes (?inline, ?raw, ?url) — they are
      // consumed as strings/assets by JS, not rendered as document styles.
      if (!mod.url.includes("?") && !seenCss.has(mod.url)) {
        seenCss.add(mod.url);
        cssUrls.push(mod.url);
      }
      return;
    }

    for (const child of mod.importedModules) {
      if (child.file) {
        const modules = ssrGraph.getModulesByFile(child.file.replace(/\\/g, "/"));
        if (modules) {
          for (const m of modules) visitModule(m);
        }
      } else {
        const childUrl = child.url.split("?")[0] ?? child.url;
        const resolved = ssrGraph.urlToModuleMap.get(childUrl);
        if (resolved) visitModule(resolved);
      }
    }
  };

  for (const file of entryFiles) {
    const modules =
      ssrGraph.getModulesByFile(file.replace(/\\/g, "/")) ??
      ssrGraph.getModulesByFile(file);
    if (!modules) continue;
    for (const mod of modules) visitModule(mod);
  }

  return cssUrls;
}

/**
 * Serves the fully compiled CSS for a dev module URL as text/css.
 * Vite's dev pipeline wraps CSS in a JS module for HMR; this endpoint
 * extracts the compiled stylesheet so it can be referenced from the
 * SSR document head as a normal render-blocking stylesheet.
 */
async function serveDevStylesheet(
  server: ViteDevServer,
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse
): Promise<void> {
  const rawUrl = req.url ?? "";
  const urlParam = new URL(rawUrl, "http://frost.local").searchParams.get("url");

  const fail = (status: number, body: string) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(body);
  };

  if (!urlParam || !urlParam.startsWith("/")) {
    fail(400, "Missing or invalid ?url= parameter");
    return;
  }

  try {
    const result = await server.transformRequest(urlParam);
    const code = result?.code ?? "";
    const match = code.match(/__vite__css\s*=\s*("(?:[^"\\]|\\.)*")/);
    if (!match) {
      fail(404, `Compiled CSS not available for ${urlParam}`);
      return;
    }
    const css = JSON.parse(match[1]!) as string;
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.end(css);
  } catch (err) {
    fail(500, err instanceof Error ? err.message : "Failed to compile CSS");
  }
}
