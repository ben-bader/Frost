import { FrostError } from "@frostjs/core";

export interface BodyParseOptions {
  maxSizeBytes?: number; // Defaults to 1MB (1024 * 1024)
}

const DEFAULT_MAX_SIZE = 1024 * 1024;

let configuredFormBytes = DEFAULT_MAX_SIZE;
let configuredJsonBytes = DEFAULT_MAX_SIZE;

/**
 * Sets process-wide default body size limits. Called by the Frost Vite
 * plugin and the production server entry from `limits.formBytes` /
 * `limits.jsonBytes` in frost.config. Explicit per-call options still win.
 */
export function setBodyLimits(limits: { formBytes?: number; jsonBytes?: number }): void {
  if (typeof limits.formBytes === "number" && limits.formBytes > 0) {
    configuredFormBytes = limits.formBytes;
  }
  if (typeof limits.jsonBytes === "number" && limits.jsonBytes > 0) {
    configuredJsonBytes = limits.jsonBytes;
  }
}

export function getBodyLimits(): { formBytes: number; jsonBytes: number } {
  return { formBytes: configuredFormBytes, jsonBytes: configuredJsonBytes };
}

function payloadTooLarge(maxBytes: number): FrostError {
  return new FrostError(`Request body exceeds maximum allowed size of ${maxBytes} bytes.`, {
    code: "FS1011",
    status: 413,
  });
}

/**
 * Reads a request body while counting bytes; aborts as soon as the
 * cumulative size exceeds maxBytes. Returns the bytes plus the
 * content-type so callers can re-parse without re-consuming the stream.
 */
async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw payloadTooLarge(maxBytes);
  }

  if (!request.body) {
    return { bytes: new Uint8Array(0), contentType: request.headers.get("content-type") };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          throw payloadTooLarge(maxBytes);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, contentType: request.headers.get("content-type") };
}

export async function parseJson<T = unknown>(
  request: Request,
  options: BodyParseOptions = {},
): Promise<T> {
  const maxBytes = options.maxSizeBytes ?? configuredJsonBytes;

  try {
    const { bytes } = await readBodyLimited(request, maxBytes);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof FrostError) throw err;
    throw new FrostError("Invalid JSON payload in request body.", {
      code: "FS1007",
      hint: "Ensure the request Content-Type is application/json and body is valid JSON.",
    });
  }
}

export async function parseFormData(
  request: Request,
  options: BodyParseOptions = {},
): Promise<Record<string, string | string[]>> {
  const maxBytes = options.maxSizeBytes ?? configuredFormBytes;

  const { bytes, contentType } = await readBodyLimited(request, maxBytes);
  const reparsed = new Request(request.url, {
    method: request.method,
    headers: { "content-type": contentType ?? "application/x-www-form-urlencoded" },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });

  const formData = await reparsed.formData();
  const result: Record<string, string | string[]> = {};

  formData.forEach((value, key) => {
    // Only process string values, files can be handled separately
    if (typeof value === "string") {
      const existing = result[key];
      if (existing === undefined) {
        result[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    }
  });

  return result;
}
