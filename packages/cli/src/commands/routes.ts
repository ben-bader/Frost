import * as fs from "node:fs";
import { discoverRoutes } from "@frost.js/router";
import { resolveConfig, type FrostConfig } from "@frost.js/core";
import { dim, mint, sym, white } from "@frost.js/core/cli-ui";
import {
  cliVersion,
  envFileList,
  projectName,
  routeCounts,
  printCliHeader,
} from "../ui.js";

export interface RoutesCommandOptions {
  /** .env files actually loaded by the CLI entry (absolute paths). */
  envFiles?: string[];
}

/** Static scan of a route module's exports (loader/action/contract/...). */
function scanExports(filePath: string): Set<string> {
  const found = new Set<string>();
  try {
    const src = fs.readFileSync(filePath, "utf-8");
    const re = /export\s+(?:const|let|var|async\s+function|function|class)\s+([A-Za-z_$][\w$]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) found.add(m[1]!);
    // export { a, b as c } and export default
    const named = /export\s*\{([^}]+)\}/g;
    while ((m = named.exec(src))) {
      for (const part of m[1]!.split(",")) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim();
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
  config?: FrostConfig,
  options: RoutesCommandOptions = {},
): Promise<void> {
  const resolved = resolveConfig(config);
  const routes = discoverRoutes({
    appDirectory: resolved.appDirectory,
    apiDirectory: resolved.apiDirectory,
    rootDir,
  });
  const counts = routeCounts(routes);

  printCliHeader({
    version: cliVersion(),
    appName: projectName(rootDir),
    rows: {
      pages: counts.pages,
      api: counts.api,
      envFiles: options.envFiles?.length
        ? envFileList(options.envFiles, rootDir)
        : undefined,
    },
  });
  console.log();
  console.log(`${dim("Discovered routes")}\n`);

  const header =
    dim("Pattern".padEnd(28)) +
    dim("Kind".padEnd(10)) +
    dim("Loader".padEnd(8)) +
    dim("Action".padEnd(8)) +
    dim("Contract".padEnd(10)) +
    dim("File Path");
  console.log(header);
  console.log(dim("-".repeat(95)));

  for (const r of routes) {
    const relFile = r.filePath
      .replace(rootDir, "")
      .replace(/^[\\\/]/, "")
      .replace(/\\/g, "/");
    const exports = scanExports(r.filePath);
    const has = (name: string) => (exports.has(name) ? mint("yes") : dim("—"));
    console.log(
      white(r.pattern.padEnd(28)) +
        dim(r.kind.padEnd(10)) +
        has("loader").padEnd(8) +
        has("action").padEnd(8) +
        has("contract").padEnd(10) +
        dim(relFile),
    );
  }
  console.log(`\n${mint(sym("diamond"))}  ${dim(`Total: ${routes.length} route(s)`)}\n`);
}
