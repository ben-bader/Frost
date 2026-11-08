import * as fs from "node:fs";
import * as path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getMimeType } from "./mime.js";

export interface StaticServerOptions {
  staticDirs: string[];
}

/** True when `child` is `parent` or inside it (path-segment aware). */
function isInsideDir(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Resolves a URL pathname to a real file inside `dir`, or null when the
 * path escapes the root (traversal, absolute paths, drive letters, UNC,
 * null bytes, or symlink escapes). Percent-escapes are decoded first.
 */
export function resolveStaticPath(dir: string, pathname: string): string | null {
  if (!pathname || pathname.includes("\0") || pathname.includes("%00")) {
    return null;
  }

  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // malformed escape — reject rather than guess
    return null;
  }
  if (decoded.includes("\0")) return null;

  const root = path.resolve(dir);

  // Strip query already handled by caller; drop leading separators so the
  // result is always relative to root. Backslashes are separators on
  // Windows and harmless-but-normalized elsewhere via path.resolve.
  const rel = decoded.replace(/^[/\\]+/, "");
  if (!rel) return null;

  const candidate = path.resolve(root, rel);
  if (!isInsideDir(root, candidate)) {
    return null;
  }

  // Symlink escape check: compare real paths when the file exists.
  try {
    const realRoot = fs.realpathSync(root);
    const realCandidate = fs.realpathSync(candidate);
    if (!isInsideDir(realRoot, realCandidate)) {
      return null;
    }
    return realCandidate;
  } catch {
    // Doesn't exist (or realpath failed) — fall through to existsSync below.
    return candidate;
  }
}

export function tryServeStaticFile(
  req: IncomingMessage,
  res: ServerResponse,
  options: StaticServerOptions
): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const rawUrl = req.url ?? "/";
  const pathname = rawUrl.split("?")[0]!;

  for (const dir of options.staticDirs) {
    const fullPath = resolveStaticPath(dir, pathname);
    if (!fullPath) continue;

    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const mime = getMimeType(fullPath);
        const etag = `W/"${stat.size}-${stat.mtimeMs.toString(16)}"`;

        // Check If-None-Match for 304 Not Modified
        if (req.headers["if-none-match"] === etag) {
          res.statusCode = 304;
          res.end();
          return true;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Length", stat.size);
        res.setHeader("ETag", etag);

        // Immutable caching for hashed assets in /assets/
        if (pathname.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
        }

        if (req.method === "HEAD") {
          res.end();
          return true;
        }

        const stream = fs.createReadStream(fullPath);
        stream.pipe(res);
        return true;
      }
    }
  }

  return false;
}
