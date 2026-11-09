import type { Plugin, ViteDevServer } from "vite";
import { loadConfigFromFile, type EnvironmentModuleNode } from "vite";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  createErrorReport,
  createLogger,
  formatErrorReportTerminal,
  resolveConfig,
  routeTypesDeclaration,
  type FrostConfig,
  type FrostErrorReport,
} from "@frost.js/core";
import { discoverRoutes, type DiscoveredRoute } from "@frost.js/router";
import { createRequestHandler } from "@frost.js/server";
import {
  isSafeRequestTarget,
  nodeReqToWebRequest,
  sendWebResponseToNode,
} from "@frost.js/adapter-node";
import { setBodyLimits } from "@frost.js/data";
import {
  VIRTUAL_ROUTES_ID,
  RESOLVED_VIRTUAL_ROUTES_ID,
  generateRoutesModuleCode,
  generateClientEntryCode,
} from "./virtual.js";
import { DEV_CLIENT_CODE, DEV_CLIENT_ID, RESOLVED_DEV_CLIENT_ID } from "./dev-client.js";
import {
  SERVER_FN_CLIENT_ID,
  RESOLVED_SERVER_FN_CLIENT_ID,
  serverFnClientCode,
} from "./server-fn-client.js";
import { transformServerFnCalls } from "./server-fn-transform.js";
import { validateClientEnvAccess, validateModuleBoundary } from "./boundary.js";

export interface FrostPluginOptions {
  /** Absolute path to the frost.config.* file — enables in-process restart on change. */
  configFile?: string;
  /** CLI flag overrides re-applied on top of the config file after a restart. */
  cliOverrides?: FrostConfig;
  /** Dev hook: one entry per completed request (CLI request lines). */
  onRequest?: (entry: { method: string; path: string; status: number; ms: number }) => void;
}

const CONFIG_FILE_RE = /^frost\.config\.(ts|js|mts|mjs|cts|cjs)$/i;
const SERVER_ONLY_RE = /(?:^|[/\\])(?:[^/\\]*\.server\.[jt]sx?|[^/\\]*api[/\\][^/\\]*\.[jt]sx?)$/i;

export function frost(
  userConfig: FrostConfig = {},
  pluginOptions: FrostPluginOptions = {},
): Plugin {
  let config = resolveConfig(userConfig);
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
  let configRestartTimer: ReturnType<typeof setTimeout> | null = null;
  let reloadPending = false;

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

  // Writes .frost/types/routes.d.ts so Link hrefs get typed autocomplete.
  const writeRouteTypes = (routes: DiscoveredRoute[]) => {
    try {
      const typesDir = path.resolve(rootDir, config.build.outDir, "types");
      fs.mkdirSync(typesDir, { recursive: true });
      fs.writeFileSync(path.join(typesDir, "routes.d.ts"), routeTypesDeclaration(routes), "utf-8");
    } catch {
      // Route types are best-effort; never break dev/build for them.
    }
  };

  const getDevRoutes = (): DiscoveredRoute[] => {
    if (!devRoutesCache) {
      devRoutesCache = discoverRoutes({
        appDirectory: config.appDirectory,
        apiDirectory: config.apiDirectory,
        rootDir,
      });
      writeRouteTypes(devRoutesCache);
    }
    return devRoutesCache;
  };

  // Applies a freshly loaded config file over CLI overrides, resets all
  // caches, and restarts the dev server. Called on frost.config.* change.
  const restartForConfigFile = async (server: ViteDevServer): Promise<void> => {
    if (!pluginOptions.configFile) return;
    try {
      const result = await loadConfigFromFile(
        { command: "serve", mode: "development" },
        pluginOptions.configFile,
        rootDir,
      );
      const fileConfig = ((result?.config ?? {}) as FrostConfig) || {};
      const cli = pluginOptions.cliOverrides;
      const merged: FrostConfig = cli?.server
        ? {
            ...fileConfig,
            server: {
              ...fileConfig.server,
              ...(cli.server.port !== undefined ? { port: cli.server.port } : {}),
              ...(cli.server.host !== undefined ? { host: cli.server.host } : {}),
            },
          }
        : fileConfig;
      config = resolveConfig(merged);
      setBodyLimits(config.limits);
      devRoutesCache = null;
      devCssCache.clear();
      console.log("\n❄️  frost.config changed — restarting dev server…\n");
      await server.restart();
      // Browser reconnects via its backoff logic; force a reload once the
      // new server is up by notifying before restart completes.
      server.ws.send({ type: "custom", event: "frost:reload", data: { reason: "config" } });
    } catch (err) {
      const report = createErrorReport(err, {
        runtime: "server",
        route: "/",
        code: "FROST_E_CONFIG",
      });
      console.error(formatErrorReportTerminal(report));
      server.ws.send({ type: "custom", event: "frost:error", data: report });
    }
  };

  return {
    name: "frost:vite-plugin",
    enforce: "pre",

    config() {
      // Expose FROST_PUBLIC_* variables to client code as
      // process.env.NAME literals so boundary-allowed reads work in the
      // browser. Non-public vars are never defined.
      const define: Record<string, string> = {};
      const prefix = config.env.publicPrefix;
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith(prefix) && value !== undefined) {
          define[`process.env.${key}`] = JSON.stringify(value);
        }
      }
      return {
        define,
        appType: "custom",
        server: {
          watch: {
            // Reliable defaults on Windows; polling stays opt-in via
            // dev.watch.usePolling for network drives / WSL edge cases.
            usePolling: config.dev.watch.usePolling,
            interval: config.dev.watch.interval,
            ignored: ["**/node_modules/**", "**/.git/**", "**/.frost/**", "**/dist/**"],
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
      if (id === DEV_CLIENT_ID || id === RESOLVED_DEV_CLIENT_ID) {
        return RESOLVED_DEV_CLIENT_ID;
      }
      if (id === SERVER_FN_CLIENT_ID || id === RESOLVED_SERVER_FN_CLIENT_ID) {
        return RESOLVED_SERVER_FN_CLIENT_ID;
      }
      if (id.startsWith("/@frost/client") || id.startsWith("@frost/client")) {
        return id;
      }
      return null;
    },

    // Inject the Frost dev client into every dev HTML document so the
    // browser participates in the frost:* ws protocol (overlay, css hot
    // update, reload). transformIndexHtml is called by our SSR middleware.
    transformIndexHtml(html) {
      if (!html.includes(DEV_CLIENT_ID)) {
        return html.replace(
          "</body>",
          `<script type="module" src="${DEV_CLIENT_ID}"></script></body>`,
        );
      }
      return html;
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

        // Server functions: rewrite createServerFn({...}) calls to fetch
        // stubs so handler code never ships to the browser.
        const transformed = transformServerFnCalls(code);
        if (transformed) return { code: transformed, map: null };
      }
      return null;
    },

    load(id) {
      if (id === RESOLVED_DEV_CLIENT_ID) {
        return DEV_CLIENT_CODE;
      }
      if (id === RESOLVED_SERVER_FN_CLIENT_ID) {
        return serverFnClientCode(config.serverFns.path);
      }
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
          const routeId = searchParams.get("id") ?? undefined;
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
            return generateClientEntryCode(file, layouts, rootDir, routeId);
          }
        }
      }
      return null;
    },

    configureServer(server: ViteDevServer) {
      const sendFrostEvent = (event: string, data: unknown = {}) => {
        server.ws.send({ type: "custom", event, data });
      };

      // If a config restart is pending, a (re)connecting client should
      // reload once it is back.
      try {
        const wsAny = server.ws as unknown as {
          on?: (event: string, cb: (socket: unknown) => void) => void;
        };
        wsAny.on?.("connection", () => {
          if (reloadPending) {
            reloadPending = false;
            sendFrostEvent("frost:reload", { reason: "config" });
          }
        });
      } catch {
        // ws API differences across Vite versions — fallback timers below.
      }

      const scheduleConfigRestart = () => {
        if (configRestartTimer) clearTimeout(configRestartTimer);
        // Debounce longer than route invalidation: config saves often
        // come in bursts and each restart is expensive.
        configRestartTimer = setTimeout(() => {
          configRestartTimer = null;
          reloadPending = true;
          void restartForConfigFile(server)
            .catch(() => {})
            .finally(() => {
              // Fallback for clients already connected when the restart
              // finished. With zero clients, leave reloadPending set so the
              // ws connection hook reloads whoever reconnects.
              setTimeout(() => {
                const clients = (server.ws as unknown as { clients?: { size: number } }).clients;
                if (reloadPending && (!clients || clients.size > 0)) {
                  reloadPending = false;
                  sendFrostEvent("frost:reload", { reason: "config" });
                }
              }, 1500);
            });
        }, 300);
      };

      // Watcher is the single source of change events. Route-table changes
      // are scoped to the app/api directories; the CSS graph cache is
      // cleared for any in-project change since imports can live anywhere.
      // Directories are resolved per event so a config restart that changes
      // appDirectory/apiDirectory takes effect immediately.
      server.watcher.on("all", (event, file) => {
        if (event !== "change" && event !== "add" && event !== "unlink") return;
        const abs = path.resolve(file);
        const appDir = path.resolve(rootDir, config.appDirectory);
        const apiDir = path.resolve(rootDir, config.apiDirectory);
        const base = path.basename(abs);

        // frost.config.* → restart the dev server in-process.
        if (CONFIG_FILE_RE.test(base)) {
          scheduleConfigRestart();
          return;
        }

        const inAppScope = isInsideDir(appDir, abs) || isInsideDir(apiDir, abs);
        if (inAppScope) {
          if (event === "add" || event === "unlink") {
            // Route table membership may have changed — invalidate
            // synchronously so the reload below sees the new table.
            devRoutesCache = null;
            devCssCache.clear();
            sendFrostEvent("frost:routes-changed", { file: abs });
            sendFrostEvent("frost:reload", { reason: "routes" });
          } else {
            scheduleRouteInvalidation();
          }
        }
        scheduleCssInvalidation();

        if (event !== "change") return;

        // Classify the change for the Frost ws protocol.
        if (CSS_FILE_RE.test(abs)) {
          sendFrostEvent("frost:css-update", { file: abs });
          return;
        }

        const rel = path.relative(rootDir, abs);
        if (rel.startsWith("..") || path.isAbsolute(rel)) return;
        if (rel.split(path.sep).includes("node_modules")) return;

        // Server-only modules (API routes, *.server.*, anything under the
        // api directory) have no client importer, so Vite's HMR will not
        // reload the page — do it explicitly.
        const isApiDirFile = isInsideDir(apiDir, abs);
        const isServerModule = SERVER_ONLY_RE.test(abs) || abs.includes(".server.");
        const inClientGraph = hasClientModule(server, abs);
        const inSsrGraph = hasSsrModule(server, abs);

        if (isApiDirFile || isServerModule || (inSsrGraph && !inClientGraph)) {
          sendFrostEvent("frost:reload", { reason: "server-module", file: abs });
        }
        // Client modules are handled by Vite's own HMR/full-reload and by
        // @vitejs/plugin-react Fast Refresh — no Frost event needed.
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
              // Dev error channel: structured reports go to the terminal
              // (formatted block) and the browser overlay over the same
              // frost:* ws protocol.
              onError: (report: FrostErrorReport) => {
                console.error(formatErrorReportTerminal(report));
                sendFrostEvent("frost:error", report);
              },
              checkDeterminism: config.dev.checkDeterminism,
              validateContracts: true, // contracts always validate in dev
              serverFnPath: config.serverFns.path,
              routerEnabled: config.router.enabled,
              routerPrefetch: config.router.prefetch,
              ssrStreaming: config.ssr.streaming,
              lang: config.app.lang,
              logger: createLogger(config.logging),
              // When the CLI supplies onRequest it renders the request line
              // itself — don't double-log through the leveled logger.
              logRequests: pluginOptions.onRequest ? false : config.logging.requestLogs,
              onRequest: pluginOptions.onRequest,
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
                      `/@frost/client?file=${encodeURIComponent(route.filePath)}${layoutsQuery}&id=${encodeURIComponent(route.id)}`,
                    ],
                    css: cssUrls.map((cssUrl) => `/@frost/css?url=${encodeURIComponent(cssUrl)}`),
                  };
                }
                return { scripts: [], css: [] };
              },
            });

            const webRequest = nodeReqToWebRequest(req);
            let webResponse = await handler(webRequest);

            // A successful document render clears any stale overlay.
            if (webResponse.status < 400) {
              sendFrostEvent("frost:error-clear");
            }

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

/** True when the file is in Vite's client module graph. */
function hasClientModule(server: ViteDevServer, absFile: string): boolean {
  const graph = server.environments?.client?.moduleGraph;
  if (!graph) return false;
  const mods =
    graph.getModulesByFile(absFile.replace(/\\/g, "/")) ?? graph.getModulesByFile(absFile);
  return !!mods && mods.size > 0;
}

/** True when the file is in Vite's SSR module graph. */
function hasSsrModule(server: ViteDevServer, absFile: string): boolean {
  const graph = server.environments?.ssr?.moduleGraph;
  if (!graph) return false;
  const mods =
    graph.getModulesByFile(absFile.replace(/\\/g, "/")) ?? graph.getModulesByFile(absFile);
  return !!mods && mods.size > 0;
}

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
      ssrGraph.getModulesByFile(file.replace(/\\/g, "/")) ?? ssrGraph.getModulesByFile(file);
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
  res: import("node:http").ServerResponse,
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
