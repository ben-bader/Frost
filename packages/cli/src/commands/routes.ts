import * as fs from "node:fs";
import { discoverRoutes } from "@frostjs/router";
import { resolveConfig, type FrostConfig } from "@frostjs/core";

/** Static scan of a route module's exports (loader/action/contract/...). */
function scanExports(filePath: string): Set<string> {
  const found = new Set<string>();
  try {
    const src = fs.readFileSync(filePath, "utf-8");
    const re =
      /export\s+(?:const|let|var|async\s+function|function|class)\s+([A-Za-z_$][\w$]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) found.add(m[1]!);
    // export { a, b as c } and export default
    const named = /export\s*\{([^}]+)\}/g;
    while ((m = named.exec(src))) {
      for (const part of m[1]!.split(",")) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) found.add(name);
      }
    }
    if (/export\s+default/.test(src)) found.add("default");
  } catch {
    // unreadable file — report nothing
  }
  return found;
}

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
    "Loader".padEnd(8) +
    "Action".padEnd(8) +
    "Contract".padEnd(10) +
    "File Path"
  );
  console.log("-".repeat(95));

  for (const r of routes) {
    const relFile = r.filePath.replace(rootDir, "").replace(/^[\\\/]/, "");
    const exports = scanExports(r.filePath);
    const has = (name: string) => (exports.has(name) ? "yes" : "—");
    console.log(
      r.pattern.padEnd(25) +
      r.kind.padEnd(10) +
      has("loader").padEnd(8) +
      has("action").padEnd(8) +
      has("contract").padEnd(10) +
      relFile
    );
  }
  console.log(`\nTotal: ${routes.length} route(s)\n`);
}
