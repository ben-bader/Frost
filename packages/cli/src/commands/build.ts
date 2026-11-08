import * as fs from "node:fs";
import * as path from "node:path";
import { build as viteBuild } from "vite";
import { frost, generateClientEntryCode } from "@frostjs/vite";
import { resolveConfig, type FrostAssets, type FrostConfig } from "@frostjs/core";
import { discoverRoutes } from "@frostjs/router";

export interface BuildCommandOptions {
  rootDir?: string;
  /** User config (typically loaded from frost.config.ts by the CLI entry). */
  config?: FrostConfig;
}

interface ViteManifestEntry {
  file: string;
  css?: string[];
  imports?: string[];
  assets?: string[];
}

type ViteManifest = Record<string, ViteManifestEntry>;

export async function buildCommand(options: BuildCommandOptions = {}): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const config = resolveConfig(options.config);
  const outDir = path.resolve(rootDir, config.build.outDir);
  const serverOutDir = path.join(outDir, "server");
  const clientOutDir = path.join(outDir, "client");
  // Generated client entry shims live in the pnpm/npm cache dir inside
  // node_modules — module resolution still works, they are never shipped
  // in outDir, and they are removed in a finally block.
  const cacheRoot = path.join(rootDir, "node_modules", ".cache", "frost");
  fs.mkdirSync(cacheRoot, { recursive: true });
  const clientEntriesDir = fs.mkdtempSync(path.join(cacheRoot, "client-entries-"));

  console.log("❄️  Building Frost application for production...");

  // 1. Discover routes
  const routes = discoverRoutes({
    appDirectory: config.appDirectory,
    apiDirectory: config.apiDirectory,
    rootDir,
  });
  const pageRoutes = routes.filter((r) => r.kind === "page");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 2. Generate one client entry per page route and build the browser bundle.
  //    Vite's manifest maps each entry to its emitted JS/CSS assets so the
  //    SSR document can reference real stylesheet links before hydration.
  console.log("📦 Compiling client bundle...");
  const clientInputs: Record<string, string> = {};
  if (pageRoutes.length > 0) {
    fs.mkdirSync(clientEntriesDir, { recursive: true });
    for (const route of pageRoutes) {
      const entryFile = path.join(
        clientEntriesDir,
        `${route.id.replace(/[\\/]/g, "_")}.ts`
      );
      fs.writeFileSync(
        entryFile,
        generateClientEntryCode(route.filePath, route.layouts ?? [], rootDir),
        "utf-8"
      );
      clientInputs[route.id] = entryFile;
    }

    try {
      await viteBuild({
        root: rootDir,
        plugins: [frost(config)],
        build: {
          outDir: clientOutDir,
          emptyOutDir: true,
          manifest: true,
          sourcemap: config.build.sourcemap,
          rollupOptions: {
            input: clientInputs,
          },
        },
      });
    } finally {
      fs.rmSync(clientEntriesDir, { recursive: true, force: true });
    }
  }

  // 3. Resolve per-route browser assets from the Vite manifest.
  const assetsByRoute = resolveRouteAssets(clientOutDir, pageRoutes.map((r) => r.id));
  const assetsManifestPath = path.join(outDir, "assets.json");
  fs.writeFileSync(assetsManifestPath, JSON.stringify(assetsByRoute, null, 2), "utf-8");

  // 4. Generate server entry script that imports virtual routes and creates handler
  const serverEntryPath = path.join(outDir, "server-entry.ts");
  const serverEntrySource = `
import { createRequestHandler } from "@frostjs/server";
import { setBodyLimits } from "@frostjs/data";
import { routes } from "virtual:frost/routes";
import assetsManifest from "./assets.json";

setBodyLimits(${JSON.stringify(config.limits)});

const assetsByRoute = assetsManifest as Record<string, { scripts: string[]; css: string[]; preloads?: { href: string; as: string; type?: string; crossOrigin?: boolean }[] }>;
const security = ${JSON.stringify(config.security)};

export const handler = createRequestHandler({
  routes,
  security,
  loadModule: async (route) => {
    const found = routes.find(r => r.id === route.id);
    return found ? found.module : null;
  },
  getAssetsForRoute: (route) => assetsByRoute[route.id] ?? { scripts: [], css: [] }
});

export default handler;
`;
  fs.writeFileSync(serverEntryPath, serverEntrySource, "utf-8");

  // 5. Build Server bundle
  console.log("📦 Compiling server bundle...");
  await viteBuild({
    root: rootDir,
    plugins: [frost(config)],
    build: {
      ssr: serverEntryPath,
      outDir: serverOutDir,
      emptyOutDir: true,
      sourcemap: config.build.sourcemap,
    },
  });

  // 6. Generate Production Manifest
  const manifestPath = path.join(outDir, "manifest.json");
  const manifest = {
    version: "0.1.0",
    buildId: `build_${Date.now()}`,
    timestamp: new Date().toISOString(),
    routes: routes.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      kind: r.kind,
      isDynamic: r.isDynamic,
      isCatchAll: r.isCatchAll,
    })),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n✅ Production build complete! Output in ${config.build.outDir}\n`);
}

function resolveRouteAssets(clientOutDir: string, routeIds: string[]): Record<string, FrostAssets> {
  const manifestPath = path.join(clientOutDir, ".vite", "manifest.json");
  const result: Record<string, FrostAssets> = {};

  let manifest: ViteManifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ViteManifest;
  } catch {
    // No client manifest — routes render without hydration assets.
  }

  // Vite manifest keys are source paths; entry chunks carry a `name`
  // matching the rollup input key (the Frost route id).
  const entryKeyByRouteId = new Map<string, string>();
  for (const [key, chunk] of Object.entries(manifest)) {
    if ((chunk as { isEntry?: boolean }).isEntry === false) continue;
    const name = (chunk as { name?: string }).name ?? key;
    if (!entryKeyByRouteId.has(name)) entryKeyByRouteId.set(name, key);
    if (!entryKeyByRouteId.has(key)) entryKeyByRouteId.set(key, key);
  }

  for (const routeId of routeIds) {
    const entryKey = entryKeyByRouteId.get(routeId);
    const entry = entryKey ? manifest[entryKey] : undefined;
    if (!entryKey || !entry) {
      result[routeId] = { scripts: [], css: [] };
      continue;
    }

    const css = new Set<string>();
    const assets = new Set<string>();
    const collectChunkAssets = (key: string, seen: Set<string>) => {
      if (seen.has(key)) return;
      seen.add(key);
      const chunk = manifest[key];
      if (!chunk) return;
      for (const file of chunk.css ?? []) css.add(`/${file}`);
      for (const file of chunk.assets ?? []) assets.add(file);
      for (const imp of chunk.imports ?? []) collectChunkAssets(imp, seen);
    };
    collectChunkAssets(entryKey, new Set());

    result[routeId] = {
      scripts: [`/${entry.file}`],
      css: [...css],
      preloads: selectFontPreloads([...assets]),
    };
  }

  return result;
}

/**
 * Selects the primary font faces worth preloading from the set of font
 * assets referenced by a route's CSS. Prefers WOFF2 latin regular/bold
 * faces; falls back to the first available font asset.
 */
function selectFontPreloads(assetFiles: string[]): FrostAssets["preloads"] {
  const fonts = assetFiles.filter((f) => /\.(woff2?|ttf|otf)$/i.test(f));
  if (fonts.length === 0) return undefined;

  const woff2 = fonts.filter((f) => /\.woff2$/i.test(f));
  const pool = woff2.length > 0 ? woff2 : fonts;

  const score = (f: string): number => {
    const base = f.split("/").pop() ?? f;
    let s = 0;
    if (/latin/i.test(base) && !/latin-ext/i.test(base)) s += 4;
    if (/-(400|regular)/i.test(base)) s += 3;
    else if (/-(700|bold)/i.test(base)) s += 2;
    else if (/-(500|600)/i.test(base)) s += 1;
    if (/normal/i.test(base)) s += 1;
    return s;
  };

  const selected = [...pool].sort((a, b) => score(b) - score(a)).slice(0, 2);

  return selected.map((file) => ({
    href: `/${file}`,
    as: "font",
    type: /\.woff2$/i.test(file) ? "font/woff2" : undefined,
    crossOrigin: true,
  }));
}
