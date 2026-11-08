import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { build as viteBuild } from "vite";
import { frost, generateClientEntryCode } from "@frost.js/vite";
import {
  resolveConfig,
  routeTypesDeclaration,
  type FrostAssets,
  type FrostConfig,
} from "@frost.js/core";
import { discoverRoutes } from "@frost.js/router";

export interface BuildCommandOptions {
  rootDir?: string;
  /** User config (typically loaded from frost.config.ts by the CLI entry). */
  config?: FrostConfig;
  /** Print a per-route bundle size report. */
  analyze?: boolean;
  /** Fail the build when budgets.clientJsKb is exceeded. */
  strict?: boolean;
}

interface ViteManifestEntry {
  file: string;
  css?: string[];
  imports?: string[];
  assets?: string[];
  isEntry?: boolean;
  name?: string;
}

type ViteManifest = Record<string, ViteManifestEntry>;

export async function buildCommand(options: BuildCommandOptions = {}): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const config = resolveConfig(options.config);
  // Production logs are structured JSON unless the user explicitly chose
  // a format in frost.config.ts.
  const prodLogging = {
    ...config.logging,
    format: options.config?.logging?.format ?? "json",
  };
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

  try {
    // 1. Discover routes
    const routes = discoverRoutes({
      appDirectory: config.appDirectory,
      apiDirectory: config.apiDirectory,
      rootDir,
    });
    const pageRoutes = routes.filter((r) => r.kind === "page");

    // Generated route types for typed Link hrefs (.frost/types/routes.d.ts).
    try {
      const typesDir = path.join(outDir, "types");
      fs.mkdirSync(typesDir, { recursive: true });
      fs.writeFileSync(path.join(typesDir, "routes.d.ts"), routeTypesDeclaration(routes), "utf-8");
    } catch {
      // best-effort
    }

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 2. Write the per-route client entry shims and the server entry.
    //    The server entry reads assets.json at runtime, so the client and
    //    server bundles have no build-time dependency and build in parallel.
    const clientInputs: Record<string, string> = {};
    if (pageRoutes.length > 0) {
      for (const route of pageRoutes) {
        const entryFile = path.join(clientEntriesDir, `${route.id.replace(/[\\/]/g, "_")}.ts`);
        fs.writeFileSync(
          entryFile,
          generateClientEntryCode(route.filePath, route.layouts ?? [], rootDir, route.id),
          "utf-8",
        );
        clientInputs[route.id] = entryFile;
      }
    }

    const serverEntryPath = path.join(outDir, "server-entry.ts");
    const serverEntrySource = `
import { readFileSync } from "node:fs";
import { createRequestHandler } from "@frost.js/server";
import { createLogger } from "@frost.js/core";
import { setBodyLimits } from "@frost.js/data";
import { routes, routeImporters } from "virtual:frost/routes";

setBodyLimits(${JSON.stringify(config.limits)});

const security = ${JSON.stringify(config.security)};

// assets.json is written after the client build; read it lazily on first
// request so server startup never depends on build ordering.
let assetsCache: Record<string, { scripts: string[]; css: string[]; preloads?: { href: string; as: string; type?: string; crossOrigin?: boolean; rel?: string }[] }> | null = null;
function loadAssets() {
  if (!assetsCache) {
    assetsCache = JSON.parse(
      readFileSync(new URL("../assets.json", import.meta.url), "utf-8")
    );
  }
  return assetsCache;
}

const importerById = new Map(Object.entries(routeImporters));

export const handler = createRequestHandler({
  routes,
  security,
  lang: ${JSON.stringify(config.app.lang)},
  logger: createLogger(${JSON.stringify(prodLogging)}),
  logRequests: ${config.logging.requestLogs},
  validateContracts: ${config.contracts.validateInProduction},
  serverFnPath: ${JSON.stringify(config.serverFns.path)},
  routerEnabled: ${config.router.enabled},
  routerPrefetch: ${JSON.stringify(config.router.prefetch)},
  ssrStreaming: ${config.ssr.streaming},
  loadModule: async (route) => {
    const importer = importerById.get(route.id);
    if (!importer) return null;
    return importer();
  },
  getAssetsForRoute: (route) => loadAssets()[route.id] ?? { scripts: [], css: [] }
});

export default handler;
`;
    fs.writeFileSync(serverEntryPath, serverEntrySource, "utf-8");

    // 3. Build client and server bundles in parallel — they share no
    //    build-time artifacts anymore.
    const clientBuild = async () => {
      if (pageRoutes.length === 0) return;
      console.log("📦 Compiling client bundle...");
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
    };

    const serverBuild = async () => {
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
    };

    await Promise.all([clientBuild(), serverBuild()]);

    // 4. Resolve per-route browser assets from the Vite manifest.
    const assetsByRoute = resolveRouteAssets(
      clientOutDir,
      pageRoutes.map((r) => r.id),
    );
    const assetsManifestPath = path.join(outDir, "assets.json");
    fs.writeFileSync(assetsManifestPath, JSON.stringify(assetsByRoute, null, 2), "utf-8");

    // 5. Pre-compress text assets (.br + .gz) for the production adapter.
    const compressed = precompressDir(clientOutDir);
    if (compressed > 0) {
      console.log(`🗜️  Pre-compressed ${compressed} asset(s) (br + gzip)`);
    }

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

    // 7. Optional SEO files: sitemap.xml + robots.txt (static routes only).
    if (config.seo.sitemap || config.seo.robots) {
      if (!config.seo.baseUrl) {
        console.warn(
          "⚠️  seo.sitemap/seo.robots enabled but seo.baseUrl is not set — skipping generation.",
        );
      } else {
        const base = config.seo.baseUrl.replace(/\/+$/, "");
        const staticPaths = pageRoutes
          .filter((r) => !r.isDynamic && !r.isCatchAll)
          .map((r) => `/${r.pattern}`.replace(/\/+/g, "/"));
        if (config.seo.sitemap) {
          const urls = staticPaths
            .map((p) => `  <url><loc>${escapeXml(base + p)}</loc></url>`)
            .join("\n");
          fs.writeFileSync(
            path.join(clientOutDir, "sitemap.xml"),
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
              `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
            "utf-8",
          );
        }
        if (config.seo.robots) {
          const sitemapLine = config.seo.sitemap ? `\nSitemap: ${base}/sitemap.xml\n` : "\n";
          fs.writeFileSync(
            path.join(clientOutDir, "robots.txt"),
            `User-agent: *\nAllow: /\n${sitemapLine}`,
            "utf-8",
          );
        }
        const skipped = pageRoutes.length - staticPaths.length;
        console.log(
          `🗺️  Generated ${config.seo.sitemap ? "sitemap.xml" : ""}${config.seo.sitemap && config.seo.robots ? " + " : ""}${config.seo.robots ? "robots.txt" : ""} (${staticPaths.length} static route(s)${skipped > 0 ? `, ${skipped} dynamic skipped` : ""})`,
        );
      }
    }

    // 8. Optional bundle report + size budgets
    if (options.analyze || config.budgets.clientJsKb) {
      printBundleReport(
        clientOutDir,
        pageRoutes.map((r) => r.id),
        {
          analyze: options.analyze === true,
          budgetKb: config.budgets.clientJsKb,
          strict: options.strict === true || config.budgets.strict === true,
        },
      );
    }

    console.log(`\n✅ Production build complete! Output in ${config.build.outDir}\n`);
  } finally {
    fs.rmSync(clientEntriesDir, { recursive: true, force: true });
  }
}

const COMPRESSIBLE_EXT = /\.(js|mjs|css|html|svg|json|txt|xml|webmanifest|map)$/i;
const SKIP_COMPRESS_EXT =
  /\.(br|gz|zip|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm|wasm)$/i;

/** Writes <file>.br and <file>.gz next to compressible assets. Returns count of source files processed. */
function precompressDir(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += precompressDir(full);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_COMPRESS_EXT.test(entry.name)) continue;
    if (!COMPRESSIBLE_EXT.test(entry.name)) continue;
    // Don't compress our own outputs or the manifest
    if (entry.name.endsWith(".br") || entry.name.endsWith(".gz")) continue;

    const data = fs.readFileSync(full);
    if (data.byteLength < 256) continue;
    try {
      fs.writeFileSync(
        full + ".br",
        zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }),
      );
      fs.writeFileSync(full + ".gz", zlib.gzipSync(data, { level: 9 }));
      count++;
    } catch {
      // best-effort per file
    }
  }
  return count;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function gzipSize(file: string): number {
  try {
    return zlib.gzipSync(fs.readFileSync(file)).byteLength;
  } catch {
    return 0;
  }
}

function fmtKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function printBundleReport(
  clientOutDir: string,
  routeIds: string[],
  opts: { analyze: boolean; budgetKb?: number; strict: boolean },
): void {
  const manifestPath = path.join(clientOutDir, ".vite", "manifest.json");
  let manifest: ViteManifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ViteManifest;
  } catch {
    console.log("⚠️  No client manifest found — skipping bundle report.");
    return;
  }

  const entryKeyByRouteId = new Map<string, string>();
  for (const [key, chunk] of Object.entries(manifest)) {
    if (chunk.isEntry === false) continue;
    const name = chunk.name ?? key;
    if (!entryKeyByRouteId.has(name)) entryKeyByRouteId.set(name, key);
    if (!entryKeyByRouteId.has(key)) entryKeyByRouteId.set(key, key);
  }

  const collectJs = (entryKey: string): Set<string> => {
    const files = new Set<string>();
    const seen = new Set<string>();
    const visit = (key: string) => {
      if (seen.has(key)) return;
      seen.add(key);
      const chunk = manifest[key];
      if (!chunk) return;
      if (chunk.file) files.add(chunk.file);
      for (const imp of chunk.imports ?? []) visit(imp);
    };
    visit(entryKey);
    return files;
  };

  let budgetExceeded = false;
  const rows: string[] = [];
  for (const routeId of routeIds) {
    const entryKey = entryKeyByRouteId.get(routeId);
    if (!entryKey) continue;
    const files = collectJs(entryKey);
    let raw = 0;
    let gzip = 0;
    for (const f of files) {
      const full = path.join(clientOutDir, f);
      if (!fs.existsSync(full)) continue;
      raw += fs.statSync(full).size;
      gzip += gzipSize(full);
    }
    const totalKb = raw / 1024;
    const over = opts.budgetKb !== undefined && totalKb > opts.budgetKb;
    if (over) budgetExceeded = true;
    rows.push(
      `${routeId.padEnd(30)} ${fmtKb(raw).padStart(10)} raw  ${fmtKb(gzip).padStart(10)} gzip  ${files.size} chunk(s)${over ? "  ⚠️ OVER BUDGET" : ""}`,
    );
  }

  if (opts.analyze || rows.length > 0) {
    console.log("\n📊 Client bundle report");
    console.log("-".repeat(80));
    for (const row of rows) console.log(row);
    console.log("-".repeat(80));
  }

  if (opts.budgetKb !== undefined) {
    if (budgetExceeded) {
      const msg = `Client JS budget of ${opts.budgetKb} KB exceeded for one or more routes.`;
      if (opts.strict) {
        throw new Error(`[frost] ${msg} Build failed (--strict).`);
      }
      console.warn(`⚠️  ${msg} (warning only — set budgets.strict or pass --strict to fail)`);
    } else {
      console.log(`✅ Client JS budget (${opts.budgetKb} KB) respected.`);
    }
  }
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
    if (chunk.isEntry === false) continue;
    const name = chunk.name ?? key;
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
    const modulePreloads = new Set<string>();
    const collectChunkAssets = (key: string, seen: Set<string>) => {
      if (seen.has(key)) return;
      seen.add(key);
      const chunk = manifest[key];
      if (!chunk) return;
      for (const file of chunk.css ?? []) css.add(`/${file}`);
      for (const file of chunk.assets ?? []) assets.add(file);
      for (const imp of chunk.imports ?? []) {
        const imported = manifest[imp];
        if (imported?.file) modulePreloads.add(`/${imported.file}`);
        collectChunkAssets(imp, seen);
      }
    };
    collectChunkAssets(entryKey, new Set());
    // The entry chunk itself is loaded via <script type="module">; its
    // static imports become modulepreload hints.
    modulePreloads.delete(`/${entry.file}`);

    result[routeId] = {
      scripts: [`/${entry.file}`],
      css: [...css],
      preloads: [
        ...[...modulePreloads].map((href) => ({
          href,
          as: "script",
          rel: "modulepreload" as const,
        })),
        ...(selectFontPreloads([...assets]) ?? []),
      ],
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
