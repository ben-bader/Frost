import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { frost } from "@frostjs/vite";
import { resolveConfig, type FrostConfig } from "@frostjs/core";

export interface DevCommandOptions {
  port?: number;
  host?: string;
  rootDir?: string;
  /** User config (typically loaded from frost.config.ts by the CLI entry). */
  config?: FrostConfig;
  /** Resolved path to frost.config.* — enables in-process restart on change. */
  configFile?: string;
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
  const boundPort =
    typeof address === "object" && address ? address.port : port;
  // Show a friendly host: wildcard/loopback binds display the configured
  // host name rather than "::" or "::1".
  const boundAddr =
    typeof address === "object" && address ? address.address : "";
  const boundHost =
    boundAddr === "::" || boundAddr === "0.0.0.0" || boundAddr === "::1" || boundAddr === "127.0.0.1"
      ? host
      : boundAddr || host;
  console.log(
    `\n❄️  Frost development server running at http://${boundHost}:${boundPort}/\n`
  );
}

