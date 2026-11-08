/**
 * Shared runtime error report — the single object that feeds both the
 * terminal diagnostic block and the browser error overlay in dev.
 */

/** Stable Frost error codes surfaced to developers. */
export const FROST_ERROR_CODES = {
  LOADER: "FROST_E_LOADER",
  ACTION: "FROST_E_ACTION",
  RENDER: "FROST_E_RENDER",
  API: "FROST_E_API",
  CONTRACT: "FROST_E_CONTRACT",
  HYDRATION: "FROST_E_HYDRATION",
  CONFIG: "FROST_E_CONFIG",
  BOUNDARY: "FROST_E_BOUNDARY",
  BODY: "FROST_E_BODY",
  MIDDLEWARE: "FROST_E_MIDDLEWARE",
  ENV: "FROST_E_ENV",
  SERVER_FN: "FROST_E_SERVERFN",
} as const;

export type FrostErrorCode = (typeof FROST_ERROR_CODES)[keyof typeof FROST_ERROR_CODES];

export interface FrostCodeFrameLine {
  line: number;
  text: string;
  /** Column (1-based) of the failing expression on this line. */
  markerColumn?: number;
}

export interface FrostErrorReport {
  name: string;
  message: string;
  code?: FrostErrorCode | string;
  /** file:line:column when known (source-mapped in dev). */
  location?: string;
  file?: string;
  line?: number;
  column?: number;
  /** Up to ~7 lines of source around the failure. */
  frame?: FrostCodeFrameLine[];
  stack?: string;
  route?: string;
  /** "server" | "client" */
  runtime: "server" | "client";
  timestamp: string;
  hint?: string;
  severity?: "error" | "warning";
}

export function createErrorReport(
  error: unknown,
  meta: Partial<FrostErrorReport> & { runtime: "server" | "client" },
): FrostErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  const frost = err as Error & {
    code?: string;
    hint?: string;
    file?: string;
    line?: number;
    column?: number;
  };

  // First stack frame that looks like user code (not node internals).
  let location: string | undefined;
  let file: string | undefined;
  let line: number | undefined;
  let column: number | undefined;
  const stackLines = (err.stack ?? "").split("\n").slice(1);
  for (const raw of stackLines) {
    const m = raw.match(/\(?((?:[A-Za-z]:)?[^()\s]+\.(?:[jt]sx?|mjs|cjs)):(\d+):(\d+)\)?/);
    if (m) {
      file = m[1];
      line = parseInt(m[2]!, 10);
      column = parseInt(m[3]!, 10);
      location = `${file}:${line}:${column}`;
      break;
    }
  }

  // Error-code precedence: an explicit FROST_E_* code set on the error
  // wins (contract/middleware errors set their own); otherwise the
  // category code supplied by the caller beats third-party codes like
  // Vite's ERR_LOAD_URL, which carry no Frost meaning.
  const errCode = typeof frost.code === "string" ? frost.code : undefined;
  const code = errCode && errCode.startsWith("FROST_E") ? errCode : (meta.code ?? errCode);

  return {
    name: err.name || "Error",
    message: err.message,
    code,
    location,
    file,
    line,
    column,
    stack: err.stack,
    route: meta.route,
    runtime: meta.runtime,
    timestamp: meta.timestamp ?? new Date().toISOString(),
    hint: frost.hint ?? meta.hint,
    severity: meta.severity ?? "error",
    frame: meta.frame,
  };
}

/** Terminal rendering: solid badges, aligned fields, optional code frame. */
export function formatErrorReportTerminal(report: FrostErrorReport): string {
  const badge =
    report.severity === "warning"
      ? "\x1b[43m\x1b[30m WARN \x1b[0m"
      : "\x1b[41m\x1b[37m ERROR \x1b[0m";

  const out: string[] = [];
  out.push(badge);
  out.push(` ${report.name}: ${report.message}`);
  if (report.code) out.push(`  code  ${report.code}`);
  if (report.location) out.push(`  at    ${report.location}`);
  if (report.route) out.push(`  route ${report.route}`);
  if (report.runtime) out.push(`  runtime ${report.runtime}`);

  if (report.frame && report.frame.length > 0) {
    out.push("");
    const width = Math.max(...report.frame.map((l) => String(l.line).length));
    for (const l of report.frame) {
      const isMarked = l.markerColumn !== undefined;
      const num = String(l.line).padStart(width);
      const gutter = isMarked ? "\x1b[41m\x1b[37m" : "\x1b[90m";
      const text = isMarked ? "\x1b[41m\x1b[37m" : "";
      out.push(`  ${gutter}${num} |\x1b[0m ${text}${l.text}\x1b[0m`);
      if (isMarked) {
        const caret =
          " ".repeat(width + 4) + " ".repeat(Math.max(0, (l.markerColumn ?? 1) - 1)) + "^";
        out.push(`  \x1b[41m\x1b[37m${caret}\x1b[0m`);
      }
    }
  }

  if (report.hint) {
    out.push("");
    out.push(`  hint  ${report.hint}`);
  }
  return out.join("\n");
}

/**
 * Strips stack/frame detail for production — clients get name, message,
 * code, and route only.
 */
export function toPublicError(report: FrostErrorReport): FrostErrorReport {
  return {
    name: report.name,
    message: report.message,
    code: report.code,
    route: report.route,
    runtime: report.runtime,
    timestamp: report.timestamp,
    severity: report.severity,
  };
}
