import { json } from "@frostjs/server";
import { parseJson } from "@frostjs/data";
import type { FrostRequestContext } from "@frostjs/core";

export async function POST(request: Request, context: FrostRequestContext): Promise<Response> {
  try {
    const body = await parseJson<Record<string, unknown>>(request);
    return json({
      received: true,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      payload: body,
    });
  } catch (err) {
    return json(
      {
        error: "Bad Request",
        message: err instanceof Error ? err.message : "Invalid JSON",
      },
      { status: 400 }
    );
  }
}

export function GET(): Response {
  return json({
    endpoint: "/api/echo",
    hint: "Send a POST request with JSON payload to test mutation reflection.",
  });
}

