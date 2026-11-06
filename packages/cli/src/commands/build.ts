import * as fs from "node:fs";
import * as path from "node:path";
import { build as viteBuild } from "vite";
import { frost } from "@frostjs/vite";
import { resolveConfig } from "@frostjs/core";
import { discoverRoutes } from "@frostjs/router";

export interface BuildCommandOptions {
  rootDir?: string;
}

export async function buildCommand(options: BuildCommandOptions = {}): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const config = resolveConfig();
  const outDir = path.resolve(rootDir, config.build.outDir);
  const serverOutDir = path.join(outDir, "server");

  console.log("❄️  Building Frost application for production...");

  // 1. Discover routes
  const routes = discoverRoutes({
    appDirectory: config.appDirectory,
    apiDirectory: config.apiDirectory,
    rootDir,
  });

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 2. Generate server entry script that imports virtual routes and creates handler
  const serverEntryPath = path.join(outDir, "server-entry.ts");
  const serverEntrySource = `
import { createRequestHandler } from "@frostjs/server";
import { routes } from "virtual:frost/routes";

export const handler = createRequestHandler({
  routes,
  loadModule: async (route) => {
    const found = routes.find(r => r.id === route.id);
    return found ? found.module : null;
  }
});

export default handler;
`;
  fs.writeFileSync(serverEntryPath, serverEntrySource, "utf-8");

  // 3. Build Server bundle
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

  // 4. Generate Production Manifest
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
