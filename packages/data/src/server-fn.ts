import type { FrostRequestContext } from "@frost.js/core";
import { validateCsrf } from "./csrf.js";

export interface ServerFnContext extends FrostRequestContext {
  request: Request;
}

export type ServerFnHandler<TInput, TOutput> = (
  input: TInput,
  context: ServerFnContext,
) => Promise<TOutput> | TOutput;

export interface ServerFnConfig<TInput, TOutput> {
  name: string;
  handler: ServerFnHandler<TInput, TOutput>;
  validateInput?: (input: unknown) => TInput;
  requireCsrf?: boolean;
}

/** Registry entry used by the /_frost/fn/<id> transport endpoint. */
export interface RegisteredServerFn {
  name: string;
  handler: ServerFnHandler<unknown, unknown>;
  validateInput?: (input: unknown) => unknown;
}

// globalThis keeps the registry shared if the package is instantiated
// more than once (e.g. dev SSR vs node import graphs).
const REGISTRY_KEY = "__FROST_SERVER_FN_REGISTRY__";
function registry(): Map<string, RegisteredServerFn> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[REGISTRY_KEY] instanceof Map)) {
    g[REGISTRY_KEY] = new Map<string, RegisteredServerFn>();
  }
  return g[REGISTRY_KEY] as Map<string, RegisteredServerFn>;
}

/** Look up a registered server function by name (used by the RPC endpoint). */
export function getServerFn(name: string): RegisteredServerFn | undefined {
  return registry().get(name);
}

/** All registered server function names (diagnostics/tests). */
export function listServerFnNames(): string[] {
  return [...registry().keys()];
}

export interface ServerFn<TInput, TOutput> {
  (input: TInput, context?: Partial<ServerFnContext>): Promise<TOutput>;
  readonly fnName: string;
}

export function createServerFn<TInput, TOutput>(
  config: ServerFnConfig<TInput, TOutput>,
): ServerFn<TInput, TOutput> {
  const serverFunction = async (
    rawInput: TInput,
    contextOverride?: Partial<ServerFnContext>,
  ): Promise<TOutput> => {
    // 1. Validate CSRF if requested and running in an HTTP context
    if (config.requireCsrf && contextOverride?.request) {
      validateCsrf(contextOverride.request);
    }

    // 2. Validate input schema if validator provided
    const validatedInput = config.validateInput ? config.validateInput(rawInput) : rawInput;

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

  // Register for the HTTP transport endpoint. In client builds the
  // Vite plugin rewrites createServerFn(...) calls to fetch stubs, so
  // this only ever registers on the server.
  registry().set(config.name, {
    name: config.name,
    handler: config.handler as ServerFnHandler<unknown, unknown>,
    validateInput: config.validateInput as ((input: unknown) => unknown) | undefined,
  });

  Object.defineProperty(serverFunction, "fnName", {
    value: config.name,
    writable: false,
  });

  return serverFunction as ServerFn<TInput, TOutput>;
}
