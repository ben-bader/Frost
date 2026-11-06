import { createServer } from "vite";
import { frost } from "@frostjs/vite";
import { resolveConfig } from "@frostjs/core";

export interface DevCommandOptions {
  port?: number;
  host?: string;
  rootDir?: string;
}

export async function devCommand(options: DevCommandOptions = {}): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const config = resolveConfig();
  const port = options.port ?? config.server.port;
  const host = options.host ?? config.server.host;

  const server = await createServer({
    root: rootDir,
    server: {
      port,
      host,
    },
    plugins: [frost(config)],
  });

  await server.listen();
  console.log(`\n❄️  Frost development server running at http://${host}:${port}/\n`);
}
