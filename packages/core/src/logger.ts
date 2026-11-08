import type { LoggingConfig } from "./config.js";

export type { LogLevel } from "./config.js";
import type { LogLevel } from "./config.js";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface FrostLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Create a leveled logger. `format: "json"` emits one structured JSON
 * object per line (production/log aggregation); `"pretty"` emits a
 * human-readable line with an ISO timestamp.
 */
export function createLogger(config: Required<LoggingConfig>): FrostLogger {
  const minLevel = LEVEL_ORDER[config.level];

  const write = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    if (LEVEL_ORDER[level] < minLevel) return;
    if (config.format === "json") {
      const line = JSON.stringify({
        level,
        time: new Date().toISOString(),
        msg: message,
        ...meta,
      });
      if (level === "error") console.error(line);
      else if (level === "warn") console.warn(line);
      else console.log(line);
      return;
    }
    const stamp = new Date().toISOString();
    const tag = level.toUpperCase().padEnd(5);
    const suffix = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${stamp}] ${tag} ${message}${suffix}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (m, meta) => write("debug", m, meta),
    info: (m, meta) => write("info", m, meta),
    warn: (m, meta) => write("warn", m, meta),
    error: (m, meta) => write("error", m, meta),
  };
}

/** One-line request log entry: method, path, status, duration. */
export function logRequest(
  logger: FrostLogger,
  entry: { method: string; path: string; status: number; ms: number },
): void {
  logger.info(`${entry.method} ${entry.path} ${entry.status} ${entry.ms}ms`, {
    method: entry.method,
    path: entry.path,
    status: entry.status,
    ms: entry.ms,
  });
}
