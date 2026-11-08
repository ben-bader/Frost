import type { FrostMiddleware } from "@frost.js/core";

/**
 * App-root middleware — runs before routing for pages and APIs.
 * Demonstrates post-processing a response; return a Response early
 * (or call next() conditionally) to short-circuit or guard routes.
 */
export const middleware: FrostMiddleware = async (_request, _context, next) => {
  const response = await next();
  if (response) {
    response.headers.set("x-frost-middleware", "active");
  }
};
