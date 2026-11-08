#!/usr/bin/env node
import { devCommand } from "./commands/dev.js";
import { buildCommand } from "./commands/build.js";
import { startCommand } from "./commands/start.js";
import { routesCommand } from "./commands/routes.js";
import { loadFrostConfig, mergeCliOverrides, findFrostConfigFile } from "./config.js";
import type { FrostConfig } from "@frostjs/core";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rootDir = process.cwd();

  function getFlag(name: string): string | undefined {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return undefined;
  }

  const portFlag = getFlag("--port") || getFlag("-p");
  const port = portFlag ? parseInt(portFlag, 10) : undefined;
  const host = getFlag("--host") || getFlag("-h");
  const configPath = getFlag("--config");

  // Load frost.config.{ts,js,mjs} once for every command. A missing file
  // falls back to defaults; a broken file fails fast with its path.
  let fileConfig: FrostConfig = {};
  let configFile: string | undefined;
  if (command && command !== "--help" && command !== "-h") {
    configFile = findFrostConfigFile({ rootDir, configPath });
    fileConfig = await loadFrostConfig({ rootDir, configPath });
  }
  const userConfig = mergeCliOverrides(fileConfig, { port, host });

  switch (command) {
    case "dev":
      await devCommand({ port, host, config: userConfig, configFile });
      break;

    case "build":
      await buildCommand({
        config: userConfig,
        analyze: args.includes("--analyze"),
        strict: args.includes("--strict"),
      });
      break;

    case "start":
      await startCommand({ port, host, config: userConfig });
      break;

    case "routes":
      await routesCommand(rootDir, userConfig);
      break;

    default:
      console.log(`
❄️  Frost Framework CLI

Usage:
  frost dev     Start the development server with HMR
  frost build   Compile application for production
  frost start   Run the production Node.js server
  frost routes  List all discovered routes

Options:
  --port, -p    Port number
  --host, -h    Host address
  --config      Path to frost.config.{ts,js,mjs} (searched in project root by default)
  --analyze     (build) print per-route client bundle sizes
  --strict      (build) fail when budgets.clientJsKb is exceeded
`);
      break;
  }
}

main().catch((err) => {
  console.error("\n❌ CLI Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
