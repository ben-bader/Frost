import type { ApiRouteModule, FrostRequestContext, FrostErrorReport } from "@frostjs/core";
import { createErrorReport, FROST_ERROR_CODES } from "@frostjs/core";
import { json } from "./response.js";

const API_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

function allowedMethods(module: ApiRouteModule): string[] {
  return Object.keys(module).filter((k) =>
    (API_METHODS as string[]).includes(k)
  );
}

export async function dispatchApiRoute(
  module: ApiRouteModule,
  request: Request,
  context: FrostRequestContext,
  onError?: (report: FrostErrorReport) => void
): Promise<Response> {
  const method = request.method.toUpperCase();
  let handler = module[method as keyof ApiRouteModule];

  // Automatic OPTIONS: advertise allowed methods when the route doesn't
  // define its own handler.
  if (!handler && method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { Allow: allowedMethods(module).join(", ") },
    });
  }

  // Automatic HEAD: reuse GET and strip the body.
  if (!handler && method === "HEAD" && module.GET) {
    handler = module.GET;
    try {
      const result = await handler(request, context);
      const headers = new Headers(result.headers);
      headers.delete("Content-Length");
      return new Response(null, { status: result.status, statusText: result.statusText, headers });
    } catch (error) {
      console.error(`[Frost] Error executing API route HEAD ${request.url}:`, error);
      return json({ error: "Internal Server Error" }, { status: 500 });
    }
  }

  if (!handler) {
    return json(
      {
        error: `Method ${method} Not Allowed`,
        allowedMethods: allowedMethods(module),
      },
      {
        status: 405,
        headers: {
          Allow: allowedMethods(module).join(", "),
        },
      }
    );
  }

  try {
    const result = await handler(request, context);
    return result;
  } catch (error) {
    console.error(`[Frost] Error executing API route ${request.method} ${request.url}:`, error);
    onError?.(
      createErrorReport(error, {
        runtime: "server",
        route: new URL(request.url).pathname,
        code: FROST_ERROR_CODES.API,
      })
    );
    const status =
      typeof (error as { status?: unknown })?.status === "number"
        ? (error as { status: number }).status
        : 500;
    return json(
      {
        error: status === 500 ? "Internal Server Error" : "Request Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status }
    );
  }
}
