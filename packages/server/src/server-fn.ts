import {
  createErrorReport,
  FROST_ERROR_CODES,
  type FrostErrorReport,
  type FrostRequestContext,
} from "@frost.js/core";
import { getServerFn, parseJson, validateCsrf } from "@frost.js/data";
import { json } from "./response.js";

export interface ServerFnDispatchOptions {
  onError?: (report: FrostErrorReport) => void;
}

function fnError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, { status });
}

/**
 * Handles POST /<serverFnPath>/<id>. Registered createServerFn handlers
 * are looked up by id; input arrives as `{ input: ... }` or a bare JSON
 * value. Errors cross the wire as { error: { code, message } } — stacks
 * never leave the server.
 */
export async function dispatchServerFn(
  request: Request,
  fnId: string,
  context: FrostRequestContext,
  options: ServerFnDispatchOptions = {},
): Promise<Response> {
  const { onError } = options;

  if (request.method !== "POST") {
    return json(
      { error: { code: "FROST_E_SERVERFN", message: "Server functions accept POST only" } },
      { status: 405, headers: { Allow: "POST" } },
    );
  }

  try {
    validateCsrf(request);
  } catch (err) {
    onError?.(
      createErrorReport(err, {
        runtime: "server",
        route: `/_frost/fn/${fnId}`,
        code: FROST_ERROR_CODES.SERVER_FN,
      }),
    );
    return fnError(403, "FROST_E_SERVERFN", "CSRF validation failed");
  }

  const registered = getServerFn(fnId);
  if (!registered) {
    return fnError(404, "FROST_E_SERVERFN", `Unknown server function: ${fnId}`);
  }

  let input: unknown;
  try {
    const body = await parseJson<unknown>(request);
    input =
      typeof body === "object" && body !== null && "input" in body
        ? (body as { input: unknown }).input
        : body;
  } catch (err) {
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? (err as { status: number }).status
        : 400;
    return fnError(status, "FROST_E_BODY", "Invalid JSON body");
  }

  if (registered.validateInput) {
    try {
      input = registered.validateInput(input);
    } catch (err) {
      onError?.(
        createErrorReport(err, {
          runtime: "server",
          route: `/_frost/fn/${fnId}`,
          code: FROST_ERROR_CODES.CONTRACT,
        }),
      );
      return fnError(
        400,
        FROST_ERROR_CODES.CONTRACT,
        err instanceof Error ? err.message : "Input validation failed",
      );
    }
  }

  try {
    const result = await registered.handler(input, {
      ...context,
      request,
    });
    if (result instanceof Response) return result;
    return json({ result });
  } catch (err) {
    onError?.(
      createErrorReport(err, {
        runtime: "server",
        route: `/_frost/fn/${fnId}`,
        code: FROST_ERROR_CODES.SERVER_FN,
      }),
    );
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? Math.min((err as { status: number }).status, 599)
        : 500;
    const code =
      typeof (err as { code?: unknown })?.code === "string" &&
      (err as { code: string }).code.startsWith("FROST_E")
        ? (err as { code: string }).code
        : FROST_ERROR_CODES.SERVER_FN;
    return fnError(status, code, err instanceof Error ? err.message : "Server function failed");
  }
}
