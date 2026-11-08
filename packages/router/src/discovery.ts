import * as fs from "node:fs";
import * as path from "node:path";
import { filePathToPattern } from "./normalize.js";
import type { DiscoveredRoute, RouteKind } from "./types.js";

export interface DiscoverOptions {
  appDirectory: string;
  apiDirectory?: string;
  rootDir?: string;
}

export function discoverRoutes(options: DiscoverOptions): DiscoveredRoute[] {
  const root = options.rootDir ?? process.cwd();
  const appDir = path.resolve(root, options.appDirectory);
  const routes: DiscoveredRoute[] = [];

  // 1. Discover app pages, layouts, error boundaries, and not-found
  const layoutsByDir = new Map<string, string>();
  const errorsByDir = new Map<string, string>();
  const pageRoutes: DiscoveredRoute[] = [];
  let notFoundFile: string | undefined;
  let middlewareFile: string | undefined;

  if (fs.existsSync(appDir)) {
    scanDirectory(appDir, "", (relPath, fullPath) => {
      const filename = path.basename(relPath);
      let kind: RouteKind | null = null;

      if (/^page\.[tj]sx?$/.test(filename)) {
        kind = "page";
      } else if (/^layout\.[tj]sx?$/.test(filename)) {
        kind = "layout";
      } else if (/^(error|_error)\.[tj]sx?$/.test(filename)) {
        const dir = path.dirname(relPath).replace(/\\/g, "/");
        errorsByDir.set(dir === "." ? "" : dir, fullPath);
        return;
      } else if (/^(not-found|_404)\.[tj]sx?$/.test(filename)) {
        // Only the app-root not-found file is global; nested ones are
        // ignored for now (documented limitation).
        if (path.dirname(relPath) === "." && !notFoundFile) {
          notFoundFile = fullPath;
        }
        return;
      } else if (/^(_?middleware)\.[tj]sx?$/.test(filename)) {
        // App-root middleware only (_middleware.ts or middleware.ts).
        if (path.dirname(relPath) === "." && !middlewareFile) {
          middlewareFile = fullPath;
        }
        return;
      }

      if (kind === "layout") {
        const dir = path.dirname(relPath).replace(/\\/g, "/");
        const normalizedDir = dir === "." ? "" : dir;
        layoutsByDir.set(normalizedDir, fullPath);
      } else if (kind === "page") {
        const { pattern, isDynamic, isCatchAll, score } = filePathToPattern(relPath);
        pageRoutes.push({
          id: relPath.replace(/\\/g, "/"),
          pattern,
          filePath: fullPath,
          kind: "page",
          isDynamic,
          isCatchAll,
          score,
        });
      }
    });

    // Compute layout chain for each page from root to leaf
    for (const page of pageRoutes) {
      const dir = path.dirname(page.id).replace(/\\/g, "/");
      const normalizedDir = dir === "." ? "" : dir;
      const segments = normalizedDir ? normalizedDir.split("/") : [];
      const layoutChain: string[] = [];

      // Check root layout
      const rootLayout = layoutsByDir.get("");
      if (rootLayout) {
        layoutChain.push(rootLayout);
      }

      // Check nested directory layouts
      let current = "";
      for (const seg of segments) {
        current = current ? `${current}/${seg}` : seg;
        const nestedLayout = layoutsByDir.get(current);
        if (nestedLayout && !layoutChain.includes(nestedLayout)) {
          layoutChain.push(nestedLayout);
        }
      }

      // Nearest error boundary: walk from the page's directory up to the
      // app root ("a/b" -> "a" -> ""), first error.tsx/_error.tsx wins.
      let errDir = normalizedDir;
      let boundary: string | undefined;
      while (true) {
        const candidate = errorsByDir.get(errDir);
        if (candidate) {
          boundary = candidate;
          break;
        }
        if (!errDir) break;
        const idx = errDir.lastIndexOf("/");
        errDir = idx === -1 ? "" : errDir.slice(0, idx);
      }
      if (boundary) page.errorBoundary = boundary;
      page.layouts = layoutChain;
      routes.push(page);
    }

    // Global not-found route (never matched; used for 404 rendering).
    if (notFoundFile) {
      const rootLayout = layoutsByDir.get("");
      routes.push({
        id: "not-found",
        pattern: "",
        filePath: notFoundFile,
        kind: "not-found",
        isDynamic: false,
        isCatchAll: false,
        score: -1,
        layouts: rootLayout ? [rootLayout] : [],
      });
    }

    // App-root middleware (runs before routing for pages and APIs).
    if (middlewareFile) {
      routes.push({
        id: path.basename(middlewareFile),
        pattern: "",
        filePath: middlewareFile,
        kind: "middleware",
        isDynamic: false,
        isCatchAll: false,
        score: -1,
      });
    }
  }

  // 2. Discover api endpoints
  if (options.apiDirectory) {
    const apiDir = path.resolve(root, options.apiDirectory);
    if (fs.existsSync(apiDir)) {
      scanDirectory(apiDir, "", (relPath, fullPath) => {
        if (/\.[tj]sx?$/.test(relPath)) {
          const { pattern, isDynamic, isCatchAll, score } = filePathToPattern(relPath);
          const apiPattern = pattern === "/" ? "/api" : `/api${pattern}`;
          routes.push({
            id: `api/${relPath.replace(/\\/g, "/")}`,
            pattern: apiPattern,
            filePath: fullPath,
            kind: "api",
            isDynamic,
            isCatchAll,
            // Prioritize API endpoints slightly higher than standard pages
            score: score + 50,
          });
        }
      });
    }
  }

  // Sort routes by score descending so static routes match before dynamic & catch-all
  routes.sort((a, b) => b.score - a.score);

  return routes;
}

function scanDirectory(
  baseDir: string,
  subDir: string,
  onFile: (relativePath: string, fullPath: string) => void,
) {
  const currentDir = path.join(baseDir, subDir);
  if (!fs.existsSync(currentDir)) return;

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const rel = path.join(subDir, entry.name);
    const full = path.join(baseDir, rel);

    if (entry.isDirectory()) {
      scanDirectory(baseDir, rel, onFile);
    } else if (entry.isFile()) {
      onFile(rel, full);
    }
  }
}
