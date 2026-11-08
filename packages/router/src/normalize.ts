/**
 * Normalizes a URL pathname by ensuring a leading slash, removing duplicate slashes,
 * and stripping trailing slashes (except for root "/").
 */
export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/" || pathname === "/index.html") {
    return "/";
  }

  // Remove /index.html suffix if present
  let normalized = pathname.replace(/\/index\.html$/, "");
  if (!normalized) return "/";

  // Ensure leading slash
  normalized = normalized.startsWith("/") ? normalized : `/${normalized}`;

  // Replace multiple sequential slashes with a single slash
  normalized = normalized.replace(/\/+/g, "/");

  // Remove trailing slash if longer than 1 character
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Decodes percent-escapes in a URL pathname one segment at a time.
 * Encoded slashes (%2F) are preserved as the literal text "%2F" inside
 * their segment so they cannot alter the route's segment structure;
 * route param decoding downstream turns them into "/" values.
 * Returns null when any segment contains a malformed escape sequence.
 */
export function decodePathname(pathname: string): string | null {
  const SLASH_SENTINEL = "\u0000FROST_SLASH\u0000";
  const segments = pathname.split("/");
  const decoded: string[] = [];

  for (const segment of segments) {
    if (!segment) {
      decoded.push(segment);
      continue;
    }
    const protectedSegment = segment.replace(/%2f/gi, SLASH_SENTINEL);
    try {
      decoded.push(decodeURIComponent(protectedSegment).replaceAll(SLASH_SENTINEL, "%2F"));
    } catch {
      return null;
    }
  }

  return decoded.join("/");
}

/**
 * Converts a file-system relative path (e.g., "users/[id]/page.tsx" or "api/health.ts")
 * into a URL pattern (e.g., "/users/:id" or "/api/health").
 */
export function filePathToPattern(relativePath: string): {
  pattern: string;
  isDynamic: boolean;
  isCatchAll: boolean;
  score: number;
} {
  // Normalize Windows separators to POSIX
  let posix = relativePath.replace(/\\/g, "/");

  // Remove file extension
  posix = posix.replace(/\.[tj]sx?$/, "");

  // Remove trailing /page or /layout
  posix = posix.replace(/\/(page|layout)$/, "");
  if (posix === "page" || posix === "layout") {
    posix = "";
  }

  const segments = posix.split("/").filter(Boolean);
  let isDynamic = false;
  let isCatchAll = false;
  let score = 0;

  const patternSegments = segments.map((seg) => {
    // Catch-all: [...slug]
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      isCatchAll = true;
      score += 1; // lowest priority
      const paramName = seg.slice(4, -1);
      return `*${paramName}`;
    }

    // Dynamic: [id]
    if (seg.startsWith("[") && seg.endsWith("]")) {
      isDynamic = true;
      score += 10; // medium priority
      const paramName = seg.slice(1, -1);
      return `:${paramName}`;
    }

    // Static segment
    score += 100; // highest priority
    return seg;
  });

  const pattern = "/" + patternSegments.join("/");
  return {
    pattern: normalizePathname(pattern),
    isDynamic,
    isCatchAll,
    score,
  };
}
