import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { createNodeServer } from "@frostjs/adapter-node";
import { resolveConfig, type FrostConfig } from "@frostjs/core";

export interface StartCommandOptions {
  port?: number;
  host?: string;
  rootDir?: string;
  /** User config (typically loaded from frost.config.ts by the CLI entry). */
  config?: FrostConfig;
}

export async function startCommand(options: StartCommandOptions = {}): Promise<void> {
  // Production server: default NODE_ENV so server-rendered error
  // fallbacks and framework diagnostics behave correctly.
  process.env.NODE_ENV ??= "production";

  const rootDir = options.rootDir ?? process.cwd();
  const config = resolveConfig(options.config);
  const port = options.port ?? config.server.port;
  const host = options.host ?? config.server.host;
  const outDir = path.resolve(rootDir, config.build.outDir);
  const serverEntry = path.join(outDir, "server", "server-entry.js");
  const publicDir = path.resolve(rootDir, config.publicDirectory);
  const clientDir = path.join(outDir, "client");

  if (!fs.existsSync(serverEntry)) {
    console.error(
      `\n❌ Production server entry not found at: ${serverEntry}\nRun 'frost build' before starting the production server.\n`,
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
    compression: config.compression,
  });

  // If the configured port is taken, fall back to the next free port with
  // a clear message instead of an opaque EADDRINUSE stack trace.
  const MAX_PORT_ATTEMPTS = 10;
  const tryListen = (attemptPort: number, remaining: number): void => {
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && remaining > 0) {
        const nextPort = attemptPort + 1;
        console.warn(`⚠️  Port ${attemptPort} is already in use, trying ${nextPort}...`);
        tryListen(nextPort, remaining - 1);
        return;
      }
      console.error(`\n❌ Failed to start server: ${err.message}\n`);
      process.exit(1);
    });

    server.listen(attemptPort, host, () => {
      const address = server.address();
      const boundPort = typeof address === "object" && address ? address.port : attemptPort;
      console.log(`\n🚀 Frost production server running at http://${host}:${boundPort}/\n`);
    });
  };

  tryListen(port, MAX_PORT_ATTEMPTS);
}
