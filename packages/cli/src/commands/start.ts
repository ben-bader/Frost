import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { createNodeServer } from "@frost.js/adapter-node";
import { resolveConfig, type FrostConfig } from "@frost.js/core";
import { printErrorBlock, warnLine } from "@frost.js/core/cli-ui";
import {
  cliVersion,
  envFileList,
  projectName,
  routeCounts,
  serverUrls,
  printCliHeader,
} from "../ui.js";

export interface StartCommandOptions {
  port?: number;
  host?: string;
  rootDir?: string;
  /** User config (typically loaded from frost.config.ts by the CLI entry). */
  config?: FrostConfig;
  /** .env files actually loaded by the CLI entry (absolute paths). */
  envFiles?: string[];
}

function failStart(message: string): never {
  printErrorBlock({ name: "Error", message, severity: "error" });
  process.exit(1);
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
    failStart(
      `Production server entry not found at: ${serverEntry}\nRun 'frost build' before starting the production server.`,
    );
  }

  // Load compiled server entry
  const serverUrl = pathToFileURL(serverEntry).href;
  const serverModule = await import(serverUrl);
  const handler = serverModule.handler || serverModule.default;

  if (typeof handler !== "function") {
    failStart("Could not find request handler in compiled server entry.");
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

  // Route counts from the real build manifest (written by `frost build`).
  let pages: number | undefined;
  let api: number | undefined;
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(outDir, "manifest.json"), "utf8"),
    ) as { routes?: { kind?: string }[] };
    if (Array.isArray(manifest.routes)) {
      const counts = routeCounts(manifest.routes as { kind: string }[]);
      pages = counts.pages;
      api = counts.api;
    }
  } catch {
    // no manifest — omit the Routes row
  }

  // If the configured port is taken, fall back to the next free port with
  // a clear message instead of an opaque EADDRINUSE stack trace.
  const MAX_PORT_ATTEMPTS = 10;
  const tryListen = (attemptPort: number, remaining: number): void => {
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && remaining > 0) {
        const nextPort = attemptPort + 1;
        console.warn(
          warnLine(`Port ${attemptPort} is already in use, trying ${nextPort}...`),
        );
        tryListen(nextPort, remaining - 1);
        return;
      }
      failStart(`Failed to start server: ${err.message}`);
    });

    server.listen(attemptPort, host, () => {
      const address = server.address();
      const urls = serverUrls(address, host, attemptPort);
      const readyMs = Math.round(process.uptime() * 1000);
      printCliHeader({
        version: cliVersion(),
        appName: projectName(rootDir),
        rows: {
          local: urls.local,
          network: urls.network,
          pages,
          api,
          envFiles: options.envFiles?.length
            ? envFileList(options.envFiles, rootDir)
            : undefined,
        },
        readyMs,
      });
      console.log();
    });
  };

  tryListen(port, MAX_PORT_ATTEMPTS);
}
