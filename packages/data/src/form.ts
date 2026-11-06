import { FrostError } from "@frostjs/core";

export interface BodyParseOptions {
  maxSizeBytes?: number; // Defaults to 1MB (1024 * 1024)
}

const DEFAULT_MAX_SIZE = 1024 * 1024;

export async function parseJson<T = unknown>(
  request: Request,
  options: BodyParseOptions = {}
): Promise<T> {
  const maxBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE;
  const contentLength = request.headers.get("content-length");

  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new FrostError(
      `Request body exceeds maximum allowed size of ${maxBytes} bytes.`,
      { code: "FS1007" }
    );
  }

  try {
    const text = await request.text();
    if (text.length > maxBytes) {
      throw new FrostError(
        `Request body exceeds maximum allowed size of ${maxBytes} bytes.`,
        { code: "FS1007" }
      );
    }
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
  options: BodyParseOptions = {}
): Promise<Record<string, string | string[]>> {
  const maxBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE;
  const contentLength = request.headers.get("content-length");

  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new FrostError(
      `Request body exceeds maximum allowed size of ${maxBytes} bytes.`,
      { code: "FS1007" }
    );
  }

  const formData = await request.formData();
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
