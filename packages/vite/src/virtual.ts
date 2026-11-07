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
    layouts: ${JSON.stringify(route.layouts || [])},
    module: ${varName}
  }`);
  });

  // Layout modules are not routes, but the production handler resolves them
  // through the same `routes` table by file path. Export them as kind
  // "layout" entries so `loadModule` can find their compiled modules.
  const layoutPaths = [
    ...new Set(routes.flatMap((r) => r.layouts ?? [])),
  ];
  layoutPaths.forEach((layoutPath, index) => {
    const varName = `layout_${index}`;
    const normalizedLayoutPath = layoutPath.replace(/\\/g, "/");
    imports.push(`import * as ${varName} from "${normalizedLayoutPath}";`);
    routeEntries.push(`  {
    id: ${JSON.stringify(layoutPath)},
    pattern: "",
    filePath: ${JSON.stringify(layoutPath)},
    kind: "layout",
    isDynamic: false,
    isCatchAll: false,
    score: 0,
    layouts: [],
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

export function generateClientEntryCode(
  pageFilePath: string,
  layoutFilePaths: string[] = [],
  rootDir?: string
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

hydrateApp(PageComponent, layoutComponents);
`;
}
