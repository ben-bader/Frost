import { json } from "@frostjs/server";
import type { FrostRequestContext } from "@frostjs/core";

export function GET(request: Request, context: FrostRequestContext): Response {
  const mem = process.memoryUsage();
  const url = new URL(request.url);

  return json({
    status: "healthy",
    framework: "Frost",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    requestId: context.requestId,
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    nodeVersion: process.version,
    platform: process.platform,
    queryParams: Object.fromEntries(url.searchParams.entries()),
  });
}
