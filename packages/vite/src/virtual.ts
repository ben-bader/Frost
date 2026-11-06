import * as path from "node:path";
import type { DiscoveredRoute } from "@frostjs/router";

export const VIRTUAL_ROUTES_ID = "virtual:frost/routes";
export const RESOLVED_VIRTUAL_ROUTES_ID = "\0" + VIRTUAL_ROUTES_ID;

export const VIRTUAL_CLIENT_ENTRY_ID = "virtual:frost/client-entry";
export const RESOLVED_VIRTUAL_CLIENT_ENTRY_ID = "\0" + VIRTUAL_CLIENT_ENTRY_ID;

export function generateRoutesModuleCode(routes: DiscoveredRoute[]): string {
  const imports: string[] = [];
  const routeEntries: string[] = [];

  routes.forEach((route, index) => {
    const varName = `route_${index}`;
    // Replace backslashes for JS import path
    const normalizedFilePath = route.filePath.replace(/\\/g, "/");
    imports.push(`import * as ${varName} from "${normalizedFilePath}";`);
    routeEntries.push(`  {
    id: ${JSON.stringify(route.id)},
    pattern: ${JSON.stringify(route.pattern)},
    filePath: ${JSON.stringify(route.filePath)},
    kind: ${JSON.stringify(route.kind)},
    isDynamic: ${route.isDynamic},
    isCatchAll: ${route.isCatchAll},
    score: ${route.score},
    module: ${varName}
  }`);
  });

  return `
${imports.join("\n")}

export const routes = [
${routeEntries.join(",\n")}
];

export default routes;
`;
}

export function generateClientEntryCode(pageFilePath: string, rootDir?: string): string {
  let importPath = pageFilePath.replace(/\\/g, "/");
  if (rootDir) {
    const rel = path.relative(rootDir, pageFilePath).replace(/\\/g, "/");
    importPath = rel.startsWith("/") ? rel : `/${rel}`;
  } else if (!importPath.startsWith("/") && !/^[a-zA-Z]:/.test(importPath)) {
    importPath = `/${importPath}`;
  } else if (/^[a-zA-Z]:/.test(importPath)) {
    importPath = `/@fs/${importPath}`;
  }

  return `
import PageModule from "${importPath}";
import { hydrateApp } from "@frostjs/react/client";

hydrateApp(PageModule.default || PageModule);
`;
}
