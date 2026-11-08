import * as fs from "node:fs";
import * as path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getMimeType } from "./mime.js";
import {
  compressBuffer,
  etagForEncoding,
  isCompressible,
  negotiateEncoding,
  type CompressionOptions,
} from "./compression.js";

export interface StaticServerOptions {
  staticDirs: string[];
  compression?: CompressionOptions;
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

function sendFile(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  opts: {
    contentType: string;
    etag: string;
    cacheControl: string;
    contentLength: number;
    contentEncoding?: string;
  },
): void {
  if (req.headers["if-none-match"] === opts.etag) {
    res.statusCode = 304;
    res.setHeader("ETag", opts.etag);
    res.setHeader("Cache-Control", opts.cacheControl);
    res.setHeader("Vary", "Accept-Encoding");
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", opts.contentType);
  res.setHeader("Content-Length", opts.contentLength);
  res.setHeader("ETag", opts.etag);
  res.setHeader("Cache-Control", opts.cacheControl);
  res.setHeader("Vary", "Accept-Encoding");
  if (opts.contentEncoding) {
    res.setHeader("Content-Encoding", opts.contentEncoding);
  }

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

export function tryServeStaticFile(
  req: IncomingMessage,
  res: ServerResponse,
  options: StaticServerOptions,
): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const rawUrl = req.url ?? "/";
  const pathname = rawUrl.split("?")[0]!;
  const compression = options.compression;
  const acceptEncoding = req.headers["accept-encoding"] as string | undefined;
  const encoding = compression?.enabled ? negotiateEncoding(acceptEncoding, compression) : null;

  for (const dir of options.staticDirs) {
    const fullPath = resolveStaticPath(dir, pathname);
    if (!fullPath) continue;

    if (!fs.existsSync(fullPath)) continue;
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const mime = getMimeType(fullPath);
    const cacheControl = pathname.includes("/assets/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600, must-revalidate";
    const baseEtag = `W/"${stat.size}-${stat.mtimeMs.toString(16)}"`;

    // 1. Pre-compressed variant built at `frost build` time (.br/.gz
    //    next to the original) — zero CPU cost per request.
    if (encoding) {
      const ext = encoding === "br" ? ".br" : ".gz";
      const precompressed = fullPath + ext;
      if (fs.existsSync(precompressed)) {
        const pstat = fs.statSync(precompressed);
        sendFile(req, res, precompressed, {
          contentType: mime,
          etag: etagForEncoding(baseEtag, encoding),
          cacheControl,
          contentLength: pstat.size,
          contentEncoding: encoding,
        });
        return true;
      }
    }

    // 2. On-the-fly compression for compressible types above threshold.
    if (
      encoding &&
      stat.size >= (compression?.threshold ?? 1024) &&
      isCompressible(mime, pathname)
    ) {
      const data = fs.readFileSync(fullPath);
      const compressed = compressBuffer(data, encoding);
      // Send buffered compressed body directly.
      const etag = etagForEncoding(baseEtag, encoding);
      if (req.headers["if-none-match"] === etag) {
        res.statusCode = 304;
        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", cacheControl);
        res.setHeader("Vary", "Accept-Encoding");
        res.end();
        return true;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", compressed.byteLength);
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", cacheControl);
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Encoding", encoding);
      if (req.method === "HEAD") {
        res.end();
        return true;
      }
      res.end(compressed);
      return true;
    }

    sendFile(req, res, fullPath, {
      contentType: mime,
      etag: baseEtag,
      cacheControl,
      contentLength: stat.size,
    });
    return true;
  }

  return false;
}
