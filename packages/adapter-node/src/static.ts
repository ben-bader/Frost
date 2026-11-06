import * as fs from "node:fs";
import * as path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getMimeType } from "./mime.js";

export interface StaticServerOptions {
  staticDirs: string[];
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

  // Prevent path traversal attacks
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");

  for (const dir of options.staticDirs) {
    const fullPath = path.join(dir, safePath);

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
        if (safePath.includes("/assets/")) {
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
