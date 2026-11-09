import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import {
  brandHeader,
  dim,
  mint,
  printRequestLine,
  sym,
  url,
  white,
  type RequestLogEntry,
} from "@frost.js/core/cli-ui";
import type { AddressInfo } from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Installed @frost.js/cli version, read from its own package.json. */
export function cliVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, "..", "package.json");
    return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version;
  } catch {
    return "0.0.0";
  }
}

/** Project name from the app's package.json, falling back to the folder. */
export function projectName(rootDir: string): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
    );
    if (typeof pkg.name === "string" && pkg.name) return pkg.name;
  } catch {
    // no package.json — fall through
  }
  return path.basename(rootDir) || "app";
}

export interface ServerAddress {
  address: string;
  family?: string;
  port: number;
}

function isLoopback(addr: string): boolean {
  return (
    addr === "127.0.0.1" ||
    addr === "::1" ||
    addr === "localhost" ||
    addr === "::" ||
    addr === "0.0.0.0"
  );
}

function firstLanAddress(): string | undefined {
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === "IPv4" && !info.internal) return info.address;
    }
  }
  return undefined;
}

export interface ServerUrls {
  /** Primary URL — always safe to print as "Local". */
  local?: string;
  /** External URL — only when the bind is reachable beyond localhost. */
  network?: string;
}

/**
 * Derive Local/Network URLs from the real bound address. Wildcard binds
 * show localhost locally plus the first LAN IPv4 as Network.
 */
export function serverUrls(
  address: AddressInfo | string | null | undefined,
  fallbackHost: string,
  fallbackPort: number,
): ServerUrls {
  const addr = typeof address === "object" && address ? address : null;
  const boundAddr = addr?.address ?? "";
  const port = addr?.port ?? fallbackPort;
  const wildcard = boundAddr === "" || boundAddr === "::" || boundAddr === "0.0.0.0";

  if (wildcard || isLoopback(boundAddr)) {
    const hostForUrl =
      boundAddr === "::1" || boundAddr === "127.0.0.1" || boundAddr === "localhost"
        ? "localhost"
        : fallbackHost === "0.0.0.0" || fallbackHost === "::"
          ? "localhost"
          : fallbackHost;
    const local = `http://${hostForUrl}:${port}/`;
    const lan = firstLanAddress();
    // Network only when the bind truly reaches beyond loopback.
    const network =
      (wildcard || boundAddr === "0.0.0.0" || boundAddr === "::") && lan
        ? `http://${lan}:${port}/`
        : boundAddr && !isLoopback(boundAddr)
          ? `http://${boundAddr}:${port}/`
          : undefined;
    return { local, network };
  }

  return {
    local: `http://${boundAddr}:${port}/`,
    network: `http://${boundAddr}:${port}/`,
  };
}

export interface HeaderRows {
  local?: string;
  network?: string;
  pages?: number;
  api?: number;
  envFiles?: string[];
  watching?: boolean;
}

/**
 * FRAME 2 header: brand block + ➜ rows. Only rows with real values are
 * emitted — nothing is invented.
 */
export function cliHeader(opts: {
  version: string;
  appName: string;
  rows?: HeaderRows;
  readyMs?: number;
}): string[] {
  const lines = brandHeader(
    [
      { text: "Frost", tone: "bold" },
      { text: ` ${opts.version}`, tone: "dim" },
    ],
    [{ text: opts.appName, tone: "dim" }],
  );
  const r = opts.rows ?? {};
  const arrow = mint(sym("arrow"));
  const label = (t: string) => dim(t.padEnd(9));
  if (lines.length) lines.push("");
  if (r.local) lines.push(`${arrow}  ${label("Local")}  ${url(r.local)}`);
  if (r.network) lines.push(`${arrow}  ${label("Network")}  ${url(r.network)}`);
  if (r.pages !== undefined || r.api !== undefined) {
    const parts: string[] = [];
    if (r.pages !== undefined) parts.push(`${r.pages} page${r.pages === 1 ? "" : "s"}`);
    if (r.api !== undefined) parts.push(`${r.api} api`);
    lines.push(`${arrow}  ${label("Routes")}  ${white(parts.join(" · "))}`);
  }
  if (r.envFiles && r.envFiles.length > 0) {
    lines.push(`${arrow}  ${label("Env")}  ${dim(r.envFiles.join(", "))}`);
  }
  if (r.watching) {
    lines.push(`${arrow}  ${dim("Watching for changes")}`);
  }
  if (lines.length && opts.readyMs !== undefined) {
    lines.push("");
    lines.push(`${mint(sym("diamond"))}  ${mint(`Ready in ${opts.readyMs} ms`)}`);
  }
  return lines;
}

export function printCliHeader(opts: Parameters<typeof cliHeader>[0]): void {
  const lines = cliHeader(opts);
  if (lines.length) console.log(lines.join("\n"));
}

/** Pretty env file paths relative to the project root. */
export function envFileList(files: string[], rootDir: string): string[] {
  const root = rootDir.replace(/\\/g, "/").replace(/\/+$/, "");
  return files.map((f) => {
    const p = f.replace(/\\/g, "/");
    return p.startsWith(root + "/") ? p.slice(root.length + 1) : path.basename(p);
  });
}

/** Route counts from the real discovered route table. */
export function routeCounts(
  routes: { kind: string }[],
): { pages: number; api: number } {
  return {
    pages: routes.filter((r) => r.kind === "page").length,
    api: routes.filter((r) => r.kind === "api").length,
  };
}

/** Dev request-line printer honoring the configured log format. */
export function devRequestPrinter(json: boolean) {
  return (entry: RequestLogEntry) => printRequestLine(entry, { json });
}
