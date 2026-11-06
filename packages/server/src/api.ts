import type { ApiRouteModule, FrostRequestContext } from "@frostjs/core";
import { json } from "./response.js";

export async function dispatchApiRoute(
  module: ApiRouteModule,
  request: Request,
  context: FrostRequestContext
): Promise<Response> {
  const method = request.method.toUpperCase();
  const handler = module[method as keyof ApiRouteModule];

  if (!handler) {
    return json(
      {
        error: `Method ${method} Not Allowed`,
        allowedMethods: Object.keys(module).filter((k) =>
          ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(k)
        ),
      },
      {
        status: 405,
        headers: {
          Allow: Object.keys(module)
            .filter((k) => ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(k))
            .join(", "),
        },
      }
    );
  }

  try {
    const result = await handler(request, context);
    return result;
  } catch (error) {
    console.error(`[Frost] Error executing API route ${request.method} ${request.url}:`, error);
    return json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

