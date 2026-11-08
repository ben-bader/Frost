import { discoverRoutes } from "@frostjs/router";
import { resolveConfig, type FrostConfig } from "@frostjs/core";

export async function routesCommand(
  rootDir = process.cwd(),
  config?: FrostConfig
): Promise<void> {
  const resolved = resolveConfig(config);
  const routes = discoverRoutes({
    appDirectory: resolved.appDirectory,
    apiDirectory: resolved.apiDirectory,
    rootDir,
  });

  console.log("\n📦 Frost Discovered Routes:\n");
  console.log(
    "Pattern".padEnd(25) +
    "Kind".padEnd(10) +
    "Dynamic".padEnd(10) +
    "File Path"
  );
  console.log("-".repeat(80));

  for (const r of routes) {
    const relFile = r.filePath.replace(rootDir, "").replace(/^[\\\/]/, "");
    console.log(
      r.pattern.padEnd(25) +
      r.kind.padEnd(10) +
      (r.isDynamic || r.isCatchAll ? "Yes" : "No").padEnd(10) +
      relFile
    );
  }
  console.log(`\nTotal: ${routes.length} route(s)\n`);
}

