import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { frost } from "@frost.js/vite";
import { resolveConfig, type FrostConfig } from "@frost.js/core";
import { discoverRoutes } from "@frost.js/router";
import {
  cliVersion,
  devRequestPrinter,
  envFileList,
  projectName,
  routeCounts,
  serverUrls,
  printCliHeader,
} from "../ui.js";

export interface DevCommandOptions {
  port?: number;
  host?: string;
  rootDir?: string;
  /** User config (typically loaded from frost.config.ts by the CLI entry). */
  config?: FrostConfig;
  /** Resolved path to frost.config.* — enables in-process restart on change. */
  configFile?: string;
  /** .env files actually loaded by the CLI entry (absolute paths). */
  envFiles?: string[];
}

export async function devCommand(options: DevCommandOptions = {}): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const config = resolveConfig(options.config);
  const port = options.port ?? config.server.port;
  const host = options.host ?? config.server.host;

  const server = await createServer({
    root: rootDir,
    appType: "custom",
    server: {
      port,
      host,
    },
    plugins: [
      frost(config, {
        configFile: options.configFile,
        // Re-apply CLI flag overrides if the config file restarts the server.
        cliOverrides: options.config,
        // Framed request lines — only when the request logger is enabled.
        onRequest: config.logging.requestLogs
          ? devRequestPrinter(config.logging.format === "json")
          : undefined,
      }),
      // Fast Refresh for React components. .server modules and files
      // under api directories are excluded — they are server-only and
      // must never become refresh boundaries. Route files that export
      // loaders/actions alongside components fall back to a full reload
      // automatically (plugin-react only refreshes pure-component modules).
      react({
        include: [/\.[jt]sx?$/],
        exclude: [/\.server\.[jt]sx?$/, /[/\\]api[/\\]/],
      }),
    ],
  });

  await server.listen();

  // Vite may fall back to another port when the requested one is busy
  // (strictPort is off by default). Report the port actually bound.
  const address = server.httpServer?.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  const urls = serverUrls(
    typeof address === "object" && address ? address : null,
    host,
    boundPort,
  );

  // Real route table for the Routes row (same discovery the plugin uses).
  let pages: number | undefined;
  let api: number | undefined;
  try {
    const routes = discoverRoutes({
      appDirectory: config.appDirectory,
      apiDirectory: config.apiDirectory,
      rootDir,
    });
    const counts = routeCounts(routes);
    pages = counts.pages;
    api = counts.api;
  } catch {
    // route scan failed — omit the Routes row rather than invent counts
  }

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
      watching: true,
    },
    readyMs,
  });
  console.log();
}
