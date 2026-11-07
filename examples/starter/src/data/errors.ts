// Demo error data for the playground dialog.
// Replace this array with real error reports when wiring up a real source.

export type ErrorSeverity = "error" | "warning" | "info";

export interface PlaygroundError {
  id: string;
  severity: ErrorSeverity;
  name: string;
  message: string;
  file: string;
  /** 1-based line of the failing code inside `snippet`. */
  failIndex: number;
  /** 1-based column the caret points at. */
  column: number;
  /** First line number shown in the snippet window. */
  snippetStart: number;
  snippet: string[];
  stack: string[];
  meta: {
    timestamp: string;
    route: string;
    runtime: "server" | "client";
    code: string;
    requestId: string;
    framework: string;
  };
  hint: string;
}

const FRAMEWORK = "frost@0.1.0";

export const PLAYGROUND_ERRORS: PlaygroundError[] = [
  {
    id: "err-hydration-001",
    severity: "error",
    name: "HydrationError",
    message: "Text content does not match server-rendered HTML.",
    file: "src/components/Counter.tsx",
    failIndex: 3,
    column: 11,
    snippetStart: 20,
    snippet: [
      "export function Counter() {",
      "  const [count, setCount] = useState(0);",
      "",
      "  return (",
      "    <span aria-live=\"polite\">{count}</span>",
      "  );",
      "}",
    ],
    stack: [
      "HydrationError: Text content does not match server-rendered HTML.",
      "    at Counter (src/components/Counter.tsx:24:11)",
      "    at hydrateRoot (node_modules/react-dom/client.js:1:2044)",
      "    at hydrateApp (packages/react/src/client.tsx:96:3)",
    ],
    meta: {
      timestamp: "2026-02-14T09:41:07.213Z",
      route: "/playground",
      runtime: "client",
      code: "FROST_E_HYDRATION",
      requestId: "req_8f21c4a0",
      framework: FRAMEWORK,
    },
    hint: "Render the same markup on server and client, or gate browser-only values behind useEffect.",
  },
  {
    id: "err-loader-002",
    severity: "error",
    name: "LoaderError",
    message: "Route loader /playground failed with status 500.",
    file: "src/app/playground/page.tsx",
    failIndex: 2,
    column: 9,
    snippetStart: 8,
    snippet: [
      "export async function loader({ url }: Route.LoaderArgs) {",
      "  const name = url.searchParams.get(\"name\") ?? \"world\";",
      "  const data = await fetchPlaygroundData(name);",
      "  return { name, data };",
      "}",
      "",
      "export default function PlaygroundPage() {",
    ],
    stack: [
      "LoaderError: fetchPlaygroundData failed: connect ECONNREFUSED",
      "    at loader (src/app/playground/page.tsx:10:18)",
      "    at runLoader (packages/data/src/loader.ts:44:11)",
      "    at handleRequest (packages/server/src/handler.ts:102:5)",
    ],
    meta: {
      timestamp: "2026-02-14T09:41:07.402Z",
      route: "/playground",
      runtime: "server",
      code: "FROST_E_LOADER",
      requestId: "req_8f21c4a0",
      framework: FRAMEWORK,
    },
    hint: "Wrap loader calls in try/catch and return a typed error payload instead of throwing.",
  },
  {
    id: "warn-contract-003",
    severity: "warning",
    name: "ContractWarning",
    message: "Route contract is missing field \"count\" in loader data.",
    file: "src/app/playground/page.tsx",
    failIndex: 4,
    column: 12,
    snippetStart: 14,
    snippet: [
      "const contract = {",
      "  name: \"string\",",
      "  delay: \"number\",",
      "  // count is declared by the component but absent from the loader",
      "  data: \"object\",",
      "};",
      "",
    ],
    stack: [
      "ContractWarning: missing field \"count\"",
      "    at validateContract (packages/core/src/contract.ts:58:9)",
      "    at loader (src/app/playground/page.tsx:16:3)",
    ],
    meta: {
      timestamp: "2026-02-14T09:41:07.511Z",
      route: "/playground",
      runtime: "server",
      code: "FROST_W_CONTRACT",
      requestId: "req_8f21c4a0",
      framework: FRAMEWORK,
    },
    hint: "Add the field to the loader return value or remove it from the route contract.",
  },
  {
    id: "err-boundary-004",
    severity: "error",
    name: "BoundaryError",
    message: "Runtime boundary crossed: server module imported into client bundle.",
    file: "src/components/Counter.tsx",
    failIndex: 1,
    column: 15,
    snippetStart: 1,
    snippet: [
      "import { getSession } from \"../server/session.server\";",
      "",
      "export function Counter() {",
      "  const session = getSession();",
      "  // ...",
      "}",
    ],
    stack: [
      "BoundaryError: runtime boundary crossed: server -> client",
      "    at validateModuleBoundary (packages/vite/src/boundary.ts:31:11)",
      "    at Counter (src/components/Counter.tsx:1:15)",
    ],
    meta: {
      timestamp: "2026-02-14T09:41:07.655Z",
      route: "/playground",
      runtime: "client",
      code: "FROST_E_BOUNDARY",
      requestId: "req_8f21c4a0",
      framework: FRAMEWORK,
    },
    hint: "Move server-only imports behind a loader or a .server module boundary.",
  },
  {
    id: "err-rejection-005",
    severity: "error",
    name: "UnhandledRejection",
    message: "fetch failed while prefetching route data.",
    file: "src/app/playground/page.tsx",
    failIndex: 5,
    column: 5,
    snippetStart: 18,
    snippet: [
      "useEffect(() => {",
      "  const ctrl = new AbortController();",
      "  fetch(\"/api/status\", { signal: ctrl.signal })",
      "    .then((r) => r.json())",
      "    .then(setStatus);",
      "  return () => ctrl.abort();",
      "}, []);",
    ],
    stack: [
      "UnhandledRejection: fetch failed",
      "    at <anonymous> (src/app/playground/page.tsx:22:5)",
      "    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
    ],
    meta: {
      timestamp: "2026-02-14T09:41:07.790Z",
      route: "/playground",
      runtime: "client",
      code: "FROST_E_UNHANDLED",
      requestId: "req_8f21c4a0",
      framework: FRAMEWORK,
    },
    hint: "Add a .catch() handler or an error boundary around the async call.",
  },
];

export function errorCounts(errors: PlaygroundError[]): {
  errors: number;
  warnings: number;
  infos: number;
} {
  return {
    errors: errors.filter((e) => e.severity === "error").length,
    warnings: errors.filter((e) => e.severity === "warning").length,
    infos: errors.filter((e) => e.severity === "info").length,
  };
}
