import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

export function nodeReqToWebRequest(req: IncomingMessage, defaultHost: string = "localhost:3000"): Request {
  const host = req.headers.host ?? defaultHost;
  const protocol = (req.socket as any)?.encrypted ? "https" : "http";
  const url = new URL(req.url ?? "/", `${protocol}://${host}`);

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
  nodeRes: ServerResponse
): Promise<void> {
  nodeRes.statusCode = webResponse.status;
  nodeRes.statusMessage = webResponse.statusText;

  webResponse.headers.forEach((val, key) => {
    nodeRes.setHeader(key, val);
  });

  if (!webResponse.body) {
    nodeRes.end();
    return;
  }

  const reader = webResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        nodeRes.write(Buffer.from(value));
      }
    }
  } finally {
    nodeRes.end();
  }
}

