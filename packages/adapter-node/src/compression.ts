import * as zlib from "node:zlib";
import type { CompressionConfig } from "@frostjs/core";

export interface CompressionOptions {
  enabled: boolean;
  brotli: boolean;
  gzip: boolean;
  threshold: number;
}

export function toCompressionOptions(config?: CompressionConfig): CompressionOptions {
  return {
    enabled: config?.enabled ?? true,
    brotli: config?.brotli ?? true,
    gzip: config?.gzip ?? true,
    threshold: config?.threshold ?? 1024,
  };
}

export type ContentEncoding = "br" | "gzip";

/** Picks the best encoding the client accepts, or null. */
export function negotiateEncoding(
  acceptEncoding: string | undefined,
  options: CompressionOptions
): ContentEncoding | null {
  if (!options.enabled || (!options.brotli && !options.gzip)) return null;
  if (!acceptEncoding) return null;

  // Simple quality-aware parse: "gzip, deflate, br" or "br;q=0.8, gzip;q=1.0"
  const accepted = new Map<string, number>();
  for (const part of acceptEncoding.split(",")) {
    const [name, ...params] = part.trim().split(";");
    const coding = name?.trim().toLowerCase();
    if (!coding) continue;
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=([\d.]+)$/);
      if (m) q = parseFloat(m[1]!);
    }
    accepted.set(coding, q);
  }

  const brQ = accepted.get("br") ?? 0;
  const gzQ = accepted.get("gzip") ?? 0;
  if (options.brotli && brQ > 0 && (!options.gzip || brQ >= gzQ)) return "br";
  if (options.gzip && gzQ > 0) return "gzip";
  if (options.brotli && brQ > 0) return "br";
  return null;
}

const COMPRESSIBLE_RE =
  /^(text\/|application\/(json|javascript|xml|x-javascript|x-www-form-urlencoded|wasm)|image\/svg\+xml|font\/(woff|ttf|otf))/i;
const SKIP_RE = /\.(br|gz|zip|png|jpe?g|gif|webp|avif|ico|woff2?|mp4|webm)$/i;

export function isCompressible(contentType: string | null, pathname = ""): boolean {
  if (!contentType) return false;
  if (!COMPRESSIBLE_RE.test(contentType)) return false;
  if (SKIP_RE.test(pathname)) return false;
  return true;
}

export function compressBuffer(data: Buffer, encoding: ContentEncoding): Buffer {
  if (encoding === "br") {
    return zlib.brotliCompressSync(data, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
    });
  }
  return zlib.gzipSync(data, { level: 6 });
}

export function decompressBuffer(data: Buffer, encoding: string): Buffer {
  if (encoding === "br") return zlib.brotliDecompressSync(data);
  if (encoding === "gzip") return zlib.gunzipSync(data);
  return data;
}

/** Encoding suffix for ETags so each variant caches independently. */
export function etagForEncoding(etag: string, encoding: ContentEncoding): string {
  return `${etag}-${encoding}`;
}
