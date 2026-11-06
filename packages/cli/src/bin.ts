#!/usr/bin/env node
import { devCommand } from "./commands/dev.js";
import { buildCommand } from "./commands/build.js";
import { startCommand } from "./commands/start.js";
import { routesCommand } from "./commands/routes.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

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

  switch (command) {
    case "dev":
      await devCommand({ port, host });
      break;

    case "build":
      await buildCommand();
      break;

    case "start":
      await startCommand({ port, host });
      break;

    case "routes":
      await routesCommand();
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
`);
      break;
  }
}

main().catch((err) => {
  console.error("\n❌ CLI Error:", err);
  process.exit(1);
});

