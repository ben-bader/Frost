import { FrostError } from "@frost.js/core";

export interface CsrfOptions {
  allowCrossOrigin?: boolean;
}

/**
 * Validates mutation requests (POST, PUT, DELETE, PATCH) against CSRF attacks
 * by verifying the `Sec-Fetch-Site` and `Origin` / `Referer` headers against the host.
 */
export function validateCsrf(request: Request, options: CsrfOptions = {}): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  if (options.allowCrossOrigin) {
    return true;
  }

  // Modern browsers send Sec-Fetch-Site
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    if (secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none") {
      return true;
    }
    throw new FrostError("CSRF violation: Cross-site request rejected.", {
      code: "FS1007",
      hint: "Requests from external origins cannot submit form mutations without explicit allowCrossOrigin configuration.",
    });
  }

  // Fallback to checking Origin / Referer against Host
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        return true;
      }
    } catch {
      // Invalid URL
    }

    throw new FrostError("CSRF violation: Request origin does not match server host.", {
      code: "FS1007",
      hint: "Origin header does not match Host header.",
    });
  }

  return true;
}
