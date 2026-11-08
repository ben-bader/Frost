import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import zlib from "node:zlib";
import {
  isCompressible,
  negotiateEncoding,
  type CompressionOptions,
} from "./compression.js";

const FALLBACK_HOST = "localhost:3000";
const FALLBACK_ORIGIN = "http://frost.local";

/**
 * Returns true when the raw request target can be turned into a safe
 * origin-form or absolute http(s) URL. Anything else (e.g. a malformed
 * absolute URI) should be rejected with 400 before bridging.
 */
export function isSafeRequestTarget(rawUrl: string | undefined): boolean {
  const target = rawUrl ?? "/";
  if (target === "*") return true;
  if (target.startsWith("/")) return true;
  // Absolute-form (used by proxies): must parse as http(s).
  if (/^https?:\/\//i.test(target)) {
    try {
      const u = new URL(target);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Reduces an IncomingMessage url to a safe path+query string.
 * - "//host/path" and "///path" collapse to a single-slash path
 *   (they are treated as paths, never as protocol-relative URLs).
 * - Absolute http(s) URLs are reduced to pathname+search.
 * - Authority-form / asterisk targets become "/".
 */
function toSafePath(rawUrl: string | undefined): string {
  let target = rawUrl ?? "/";

  if (/^https?:\/\//i.test(target)) {
    try {
      const u = new URL(target);
      target = `${u.pathname}${u.search}` || "/";
    } catch {
      target = "/";
    }
  } else if (!target.startsWith("/")) {
    // authority-form (CONNECT) or "*" — not routable here
    target = "/";
  }

  // Collapse leading slashes so "//evil.example/x" is a path, not a host.
  target = "/" + target.replace(/^\/+/, "");
  if (!target.includes("?")) {
    // keep query if present; nothing else to do
  }
  return target || "/";
}

/** Host header values are interpolated into a URL; reject anything odd. */
function sanitizeHost(rawHost: string | undefined): string {
  if (!rawHost) return FALLBACK_HOST;
  // Allow DNS names, IPv4, IPv6 literals, ports. Nothing else.
  if (/^[a-zA-Z0-9.\-:[\]]{1,255}$/.test(rawHost)) {
    return rawHost;
  }
  return FALLBACK_HOST;
}

export function nodeReqToWebRequest(
  req: IncomingMessage,
  defaultHost: string = FALLBACK_HOST,
): Request {
  const host = sanitizeHost(req.headers.host ?? defaultHost);
  const protocol = (req.socket as any)?.encrypted ? "https" : "http";
  const base = `${protocol}://${host}`;
  const path = toSafePath(req.url);

  let url: URL;
  try {
    url = new URL(path, base);
  } catch {
    // Last-resort: never throw from the bridge. The request will 404.
    url = new URL("/", FALLBACK_ORIGIN);
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        headers.append(key, v);
      }
    } else {
      headers.set(key, value);
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const init: RequestInit = {
    method: req.method ?? "GET",
    headers,
  };

  if (hasBody) {
    // In Node.js 18+, Readable.toWeb creates a web ReadableStream
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    // duplex is required by Node's fetch/Request implementation for body streams
    (init as any).duplex = "half";
  }

  return new Request(url.toString(), init);
}

export async function sendWebResponseToNode(
  webResponse: Response,
  nodeRes: ServerResponse,
  compression?: CompressionOptions,
): Promise<void> {
  nodeRes.statusCode = webResponse.status;
  nodeRes.statusMessage = webResponse.statusText;

  const headers = new Headers(webResponse.headers);
  const acceptEncoding = (nodeRes as any).req?.headers?.["accept-encoding"] as
    | string
    | undefined;
  const contentType = headers.get("content-type");
  const encoding =
    webResponse.body && compression?.enabled
      ? negotiateEncoding(acceptEncoding, compression)
      : null;
  const threshold = compression?.threshold ?? 1024;
  const contentLength = Number(headers.get("content-length") ?? 0);
  const maybeCompress =
    !!webResponse.body &&
    !!encoding &&
    isCompressible(contentType, "") &&
    (contentLength === 0 || contentLength >= threshold);

  if (!webResponse.body) {
    headers.forEach((val, key) => nodeRes.setHeader(key, val));
    nodeRes.end();
    return;
  }

  const reader = webResponse.body.getReader();

  if (!maybeCompress || !encoding) {
    headers.set("Vary", mergeVary(headers.get("Vary"), "Accept-Encoding"));
    headers.forEach((val, key) => nodeRes.setHeader(key, val));
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) nodeRes.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
      nodeRes.end();
    }
    return;
  }

  // Peek up to `threshold` bytes: bodies that end below it are sent
  // raw (spec: skip small bodies); larger bodies stream through a zlib
  // transform so TTFB is preserved — no full-buffer wait.
  const prefix: Buffer[] = [];
  let prefixBytes = 0;
  let overflow = false;
  while (prefixBytes <= threshold) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const buf = Buffer.from(value);
    prefix.push(buf);
    prefixBytes += buf.byteLength;
    if (prefixBytes > threshold) {
      overflow = true;
      break;
    }
  }

  if (!overflow) {
    // Small body — send identity, no Content-Encoding.
    headers.set("Vary", mergeVary(headers.get("Vary"), "Accept-Encoding"));
    headers.forEach((val, key) => nodeRes.setHeader(key, val));
    for (const buf of prefix) nodeRes.write(buf);
    nodeRes.end();
    return;
  }

  headers.set("Content-Encoding", encoding);
  headers.delete("Content-Length");
  // A strong ETag describes the identity body; drop it rather than
  // serve a mismatched validator for the compressed variant.
  headers.delete("etag");
  headers.set("Vary", mergeVary(headers.get("Vary"), "Accept-Encoding"));
  headers.forEach((val, key) => nodeRes.setHeader(key, val));

  const compressor =
    encoding === "br"
      ? zlib.createBrotliCompress({
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
        })
      : zlib.createGzip({ level: 6 });
  compressor.on("error", () => nodeRes.destroy());
  compressor.pipe(nodeRes);

  // zlib buffers output internally. Flush once after the first chunk
  // so headers + leading compressed bytes reach the client early
  // (TTFB), then let zlib batch the rest — per-chunk sync flushes are
  // too expensive for React's many small stream chunks.
  let flushed = false;
  const writeChunk = async (buf: Buffer) => {
    await new Promise<void>((resolve, reject) =>
      compressor.write(buf, (err) => (err ? reject(err) : resolve())),
    );
    if (!flushed) {
      flushed = true;
      await new Promise<void>((resolve) => compressor.flush(() => resolve()));
    }
  };

  try {
    for (const buf of prefix) await writeChunk(buf);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) await writeChunk(Buffer.from(value));
    }
    compressor.end();
  } catch {
    nodeRes.destroy();
  } finally {
    reader.releaseLock();
  }
}

function mergeVary(existing: string | null, value: string): string {
  if (!existing) return value;
  const parts = existing.split(",").map((v) => v.trim().toLowerCase());
  if (parts.includes(value.toLowerCase()) || parts.includes("*")) return existing;
  return `${existing}, ${value}`;
}
