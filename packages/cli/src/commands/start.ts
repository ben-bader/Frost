import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { createNodeServer } from "@frostjs/adapter-node";
import { resolveConfig } from "@frostjs/core";

export interface StartCommandOptions {
  port?: number;
  host?: string;
  rootDir?: string;
}

export async function startCommand(options: StartCommandOptions = {}): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const config = resolveConfig();
  const port = options.port ?? config.server.port;
  const host = options.host ?? config.server.host;
  const outDir = path.resolve(rootDir, config.build.outDir);
  const serverEntry = path.join(outDir, "server", "server-entry.js");
  const publicDir = path.resolve(rootDir, config.publicDirectory);
  const clientDir = path.join(outDir, "client");

  if (!fs.existsSync(serverEntry)) {
    console.error(
      `\n❌ Production server entry not found at: ${serverEntry}\nRun 'frost build' before starting the production server.\n`
    );
    process.exit(1);
  }

  // Load compiled server entry
  const serverUrl = pathToFileURL(serverEntry).href;
  const serverModule = await import(serverUrl);
  const handler = serverModule.handler || serverModule.default;

  if (typeof handler !== "function") {
    console.error(`\n❌ Could not find request handler in compiled server entry.\n`);
    process.exit(1);
  }

  const staticDirs: string[] = [];
  if (fs.existsSync(clientDir)) staticDirs.push(clientDir);
  if (fs.existsSync(publicDir)) staticDirs.push(publicDir);

  const server = createNodeServer({
    port,
    host,
    staticDirs,
    handleRequest: handler,
  });

  server.listen(port, host, () => {
    console.log(`\n🚀 Frost production server running at http://${host}:${port}/\n`);
  });
}

