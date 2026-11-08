import type { FrostRequestContext } from "./types.js";

export function createRequestContext(req?: Request, overrides?: Partial<FrostRequestContext>): FrostRequestContext {
  const requestId =
    overrides?.requestId ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  return {
    requestId,
    startTime: overrides?.startTime ?? Date.now(),
    memo: overrides?.memo ?? new Map<string, unknown>(),
    clientIp: overrides?.clientIp ?? req?.headers.get("x-forwarded-for") ?? undefined,
    userAgent: overrides?.userAgent ?? req?.headers.get("user-agent") ?? undefined,
    cspNonce: overrides?.cspNonce,
  };
}

