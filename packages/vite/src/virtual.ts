import * as path from "node:path";
import type { DiscoveredRoute } from "@frostjs/router";

export const VIRTUAL_ROUTES_ID = "virtual:frost/routes";
export const RESOLVED_VIRTUAL_ROUTES_ID = "\0" + VIRTUAL_ROUTES_ID;

export const VIRTUAL_CLIENT_ENTRY_ID = "virtual:frost/client-entry";
export const RESOLVED_VIRTUAL_CLIENT_ENTRY_ID = "\0" + VIRTUAL_CLIENT_ENTRY_ID;

export function generateRoutesModuleCode(routes: DiscoveredRoute[]): string {
  const importers: string[] = [];
  const routeEntries: string[] = [];

  // Route modules are loaded lazily: each entry gets a dynamic import()
  // so the production server only pays for the routes a request needs.
  routes.forEach((route) => {
    const normalizedFilePath = route.filePath.replace(/\\/g, "/");
    importers.push(
      `  ${JSON.stringify(route.id)}: () => import(${JSON.stringify(normalizedFilePath)})`
    );
    routeEntries.push(`  {
    id: ${JSON.stringify(route.id)},
    pattern: ${JSON.stringify(route.pattern)},
    filePath: ${JSON.stringify(route.filePath)},
    kind: ${JSON.stringify(route.kind)},
    isDynamic: ${route.isDynamic},
    isCatchAll: ${route.isCatchAll},
    score: ${route.score},
    layouts: ${JSON.stringify(route.layouts || [])},
    errorBoundary: ${JSON.stringify(route.errorBoundary ?? null)}
  }`);
  });

  // Layout and error-boundary modules are not routes, but the production
  // handler resolves them through the same `routes` table by file path.
  // Export them as kind "layout" entries so `loadModule` can find their
  // compiled modules.
  const auxPaths = [
    ...new Set([
      ...routes.flatMap((r) => r.layouts ?? []),
      ...routes.map((r) => r.errorBoundary).filter((p): p is string => !!p),
    ]),
  ];
  auxPaths.forEach((auxPath) => {
    const normalizedAuxPath = auxPath.replace(/\\/g, "/");
    importers.push(
      `  ${JSON.stringify(auxPath)}: () => import(${JSON.stringify(normalizedAuxPath)})`
    );
    routeEntries.push(`  {
    id: ${JSON.stringify(auxPath)},
    pattern: "",
    filePath: ${JSON.stringify(auxPath)},
    kind: "layout",
    isDynamic: false,
    isCatchAll: false,
    score: 0,
    layouts: [],
    errorBoundary: null
  }`);
  });

  return `
export const routeImporters = {
${importers.join(",\n")}
};

export const routes = [
${routeEntries.join(",\n")}
];

export default routes;
`;
}

export function generateClientEntryCode(
  pageFilePath: string,
  layoutFilePaths: string[] = [],
  rootDir?: string,
  routeId?: string
): string {
  function toImportPath(filePath: string): string {
    let importPath = filePath.replace(/\\/g, "/");
    if (rootDir) {
      const rel = path.relative(rootDir, filePath).replace(/\\/g, "/");
      importPath = rel.startsWith("/") ? rel : `/${rel}`;
    } else if (!importPath.startsWith("/") && !/^[a-zA-Z]:/.test(importPath)) {
      importPath = `/${importPath}`;
    } else if (/^[a-zA-Z]:/.test(importPath)) {
      importPath = `/@fs/${importPath}`;
    }
    return importPath;
  }

  const pageImportPath = toImportPath(pageFilePath);
  const layoutImports = layoutFilePaths.map((layoutPath, index) => {
    const importPath = toImportPath(layoutPath);
    return `import Layout_${index} from "${importPath}";`;
  });

  const layoutArray = layoutFilePaths
    .map((_, index) => `Layout_${index}.default || Layout_${index}`)
    .join(", ");

  return `
import PageModule from "${pageImportPath}";
${layoutImports.join("\n")}
import { hydrateApp } from "@frostjs/react/client";

const PageComponent = PageModule.default || PageModule;
const layoutComponents = [${layoutArray}];

hydrateApp(PageComponent, layoutComponents, ${JSON.stringify(routeId ?? "")});
`;
}
