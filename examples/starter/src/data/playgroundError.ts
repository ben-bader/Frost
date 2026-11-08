// Demo error data for the playground bento grid.
// Both the terminal output and the browser dialog render from this object,
// so they stay in sync. Replace with real error reports when available.

export interface PlaygroundError {
  name: string;
  message: string;
  code: string;
  file: string;
  /** 1-based line:column of the failing code. */
  line: number;
  column: number;
  /** Snippet window: first line number + the lines themselves. */
  snippetStart: number;
  snippet: string[];
  /** Index (0-based) inside `snippet` of the failing line. */
  failIndex: number;
  route: string;
  runtime: "server" | "client";
  timestamp: string;
  hint: string;
  /** Secondary warning printed after the error. */
  warning: {
    message: string;
    file: string;
    line: number;
    column: number;
  };
}

export const PLAYGROUND_ERROR: PlaygroundError = {
  name: "HydrationError",
  message: "Text content does not match server-rendered HTML.",
  code: "FROST_E_HYDRATION",
  file: "app/playground/Counter.tsx",
  line: 24,
  column: 11,
  snippetStart: 22,
  snippet: [
    "  return (",
    "    <button onClick={inc}>",
    "      {count}",
    "    </button>",
  ],
  failIndex: 2,
  route: "/playground",
  runtime: "client",
  timestamp: "12:04:11",
  hint: "Render the count after mount, or pass the server value as the initial state.",
  warning: {
    message: 'route contract missing field "count"',
    file: "app/playground/route.ts",
    line: 8,
    column: 3,
  },
};

export function errorToText(e: PlaygroundError): string {
  const failLine = e.snippetStart + e.failIndex;
  return [
    `${e.name}: ${e.message}`,
    `  at ${e.file}:${failLine}:${e.column}`,
    `  code ${e.code}`,
    "",
    ...e.snippet.map((l, i) => {
      const n = e.snippetStart + i;
      return `${i === e.failIndex ? ">" : " "} ${n} | ${l}`;
    }),
    "",
    `WARN  ${e.warning.message}`,
    `  at ${e.warning.file}:${e.warning.line}:${e.warning.column}`,
    "",
    `route: ${e.route}  runtime: ${e.runtime}  time: ${e.timestamp}`,
    `hint: ${e.hint}`,
  ].join("\n");
}
