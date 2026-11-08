import type { ResolvedSecurityConfig } from "@frost.js/core";

export interface SecurityHeadersOptions {
  security?: ResolvedSecurityConfig;
  /** Per-request CSP nonce substituted for {nonce} in the policy. */
  nonce?: string;
}

const ALWAYS_ON: Array<[string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
];

/**
 * Applies Frost's baseline security headers plus the configured CSP,
 * HSTS, and Permissions-Policy. Never overwrites a header the response
 * already set (handlers may set their own).
 */
export function applySecurityHeaders(headers: Headers, options: SecurityHeadersOptions = {}): void {
  for (const [name, value] of ALWAYS_ON) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  const security = options.security;
  if (security?.csp) {
    const policy = options.nonce
      ? security.csp.replaceAll("{nonce}", options.nonce)
      : security.csp.replaceAll("{nonce}", "");
    const headerName =
      security.cspMode === "enforce"
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only";
    if (!headers.has(headerName)) {
      headers.set(headerName, policy);
    }
  }

  if (security?.hsts) {
    if (!headers.has("Strict-Transport-Security")) {
      const parts = [`max-age=${security.hsts.maxAge}`];
      if (security.hsts.includeSubDomains) parts.push("includeSubDomains");
      if (security.hsts.preload) parts.push("preload");
      headers.set("Strict-Transport-Security", parts.join("; "));
    }
  }

  if (security?.permissionsPolicy) {
    if (!headers.has("Permissions-Policy")) {
      headers.set("Permissions-Policy", security.permissionsPolicy);
    }
  }
}
