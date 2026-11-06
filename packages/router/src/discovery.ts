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

  // 1. Discover app pages and layouts
  if (fs.existsSync(appDir)) {
    scanDirectory(appDir, "", (relPath, fullPath) => {
      const filename = path.basename(relPath);
      let kind: RouteKind | null = null;

      if (/^page\.[tj]sx?$/.test(filename)) {
        kind = "page";
      } else if (/^layout\.[tj]sx?$/.test(filename)) {
        kind = "layout";
      }

      if (kind) {
        const { pattern, isDynamic, isCatchAll, score } = filePathToPattern(relPath);
        routes.push({
          id: relPath.replace(/\\/g, "/"),
          pattern,
          filePath: fullPath,
          kind,
          isDynamic,
          isCatchAll,
          score,
        });
      }
    });
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
  onFile: (relativePath: string, fullPath: string) => void
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
