import { json } from "@frostjs/server";
import type { FrostRequestContext } from "@frostjs/core";

export function GET(request: Request, context: FrostRequestContext): Response {
  return json({
    status: "healthy",
    framework: "Frost",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    requestId: context.requestId,
  });
}

