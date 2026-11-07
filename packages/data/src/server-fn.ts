import type { FrostRequestContext } from "@frostjs/core";
import { validateCsrf } from "./csrf.js";

export interface ServerFnContext extends FrostRequestContext {
  request: Request;
}

export type ServerFnHandler<TInput, TOutput> = (
  input: TInput,
  context: ServerFnContext
) => Promise<TOutput> | TOutput;

export interface ServerFnConfig<TInput, TOutput> {
  name: string;
  handler: ServerFnHandler<TInput, TOutput>;
  validateInput?: (input: unknown) => TInput;
  requireCsrf?: boolean;
}

export interface ServerFn<TInput, TOutput> {
  (input: TInput, context?: Partial<ServerFnContext>): Promise<TOutput>;
  readonly fnName: string;
}

export function createServerFn<TInput, TOutput>(
  config: ServerFnConfig<TInput, TOutput>
): ServerFn<TInput, TOutput> {
  const serverFunction = async (
    rawInput: TInput,
    contextOverride?: Partial<ServerFnContext>
  ): Promise<TOutput> => {
    // 1. Validate CSRF if requested and running in an HTTP context
    if (config.requireCsrf && contextOverride?.request) {
      validateCsrf(contextOverride.request);
    }

    // 2. Validate input schema if validator provided
    const validatedInput = config.validateInput
      ? config.validateInput(rawInput)
      : rawInput;

    const ctx: ServerFnContext = {
      requestId: contextOverride?.requestId ?? "direct_call",
      startTime: contextOverride?.startTime ?? Date.now(),
      memo: contextOverride?.memo ?? new Map(),
      clientIp: contextOverride?.clientIp,
      userAgent: contextOverride?.userAgent,
      request: contextOverride?.request ?? new Request("http://localhost/"),
    };

    return await config.handler(validatedInput, ctx);
  };

  Object.defineProperty(serverFunction, "fnName", {
    value: config.name,
    writable: false,
  });

  return serverFunction as ServerFn<TInput, TOutput>;
}

