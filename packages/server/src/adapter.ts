import type { FrostRequestContext } from "@frostjs/core";
import { createRequestContext } from "@frostjs/core";
import type { RequestHandlerOptions } from "./handler.js";
import { createRequestHandler } from "./handler.js";

/**
 * Minimal adapter interface: any host that can accept a Web
 * Request and return a Web Response can run Frost.
 */
export interface FrostAdapter {
  handle(request: Request, context?: Partial<FrostRequestContext>): Promise<Response>;
}

/**
 * Fetch-style adapter for edge/serverless runtimes (Cloudflare
 * Workers, Vercel Edge, Deno Deploy, Bun). Deploy the same
 * createRequestHandler options you use on Node — only the transport
 * differs. Static file serving is host-specific; serve `public/` and
 * hashed assets through your platform's asset layer or a small fetch
 * wrapper around the same containment rules.
 */
export function createFetchAdapter(options: RequestHandlerOptions): FrostAdapter {
  const handler = createRequestHandler(options);
  return {
    handle: (request, context) => handler(request, context),
  };
}

export { createRequestContext };
