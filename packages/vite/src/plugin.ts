import type { Plugin, ViteDevServer } from "vite";
import { resolveConfig, type FrostConfig } from "@frostjs/core";
import { discoverRoutes, type DiscoveredRoute } from "@frostjs/router";
import { createRequestHandler } from "@frostjs/server";
import { nodeReqToWebRequest, sendWebResponseToNode } from "@frostjs/adapter-node";
import {
  VIRTUAL_ROUTES_ID,
  RESOLVED_VIRTUAL_ROUTES_ID,
  generateRoutesModuleCode,
} from "./virtual.js";
import { validateModuleBoundary } from "./boundary.js";

export function frost(userConfig: FrostConfig = {}): Plugin {
  const config = resolveConfig(userConfig);
  let rootDir: string;
  let isClientBuild = true;
  let cachedRoutes: DiscoveredRoute[] = [];

  return {
    name: "frost:vite-plugin",
    enforce: "pre",

    configResolved(resolvedViteConfig) {
      rootDir = resolvedViteConfig.root;
      isClientBuild = !resolvedViteConfig.build.ssr;
      cachedRoutes = discoverRoutes({
        appDirectory: config.appDirectory,
        apiDirectory: config.apiDirectory,
        rootDir,
      });
    },

    resolveId(id, importer) {
      // 1. Boundary enforcement
      validateModuleBoundary(id, importer, isClientBuild);

      // 2. Virtual route module
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_VIRTUAL_ROUTES_ID;
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
      return null;
    },

    configureServer(server: ViteDevServer) {
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

          try {
            // Re-discover routes on demand in dev for instant file-based route HMR
            cachedRoutes = discoverRoutes({
              appDirectory: config.appDirectory,
              apiDirectory: config.apiDirectory,
              rootDir,
            });

            // Create request handler using Vite's ssrLoadModule
            const handler = createRequestHandler({
              routes: cachedRoutes,
              loadModule: async (route) => {
                return (await server.ssrLoadModule(route.filePath)) as any;
              },
              getAssetsForRoute: () => {
                // In Vite dev, Vite's client script is injected automatically
                return {
                  scripts: ["/@vite/client"],
                  css: [],
                };
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
