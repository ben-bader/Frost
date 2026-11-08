import * as http from "node:http";
import { isSafeRequestTarget, nodeReqToWebRequest, sendWebResponseToNode } from "./bridge.js";
import { tryServeStaticFile } from "./static.js";
import { toCompressionOptions, type CompressionOptions } from "./compression.js";
import type { CompressionConfig } from "@frostjs/core";

export interface NodeServerOptions {
  port?: number;
  host?: string;
  staticDirs?: string[];
  handleRequest: (request: Request) => Promise<Response>;
  /** Response compression settings (from frost.config compression.*). */
  compression?: CompressionConfig | CompressionOptions;
}

export function createNodeServer(options: NodeServerOptions): http.Server {
  const { port = 3000, host = "localhost", staticDirs = [], handleRequest } = options;
  const compression = options.compression
    ? "enabled" in options.compression && "threshold" in options.compression
      ? (options.compression as CompressionOptions)
      : toCompressionOptions(options.compression as CompressionConfig)
    : undefined;

  const server = http.createServer(async (req, res) => {
    try {
      // 1. Health check endpoint
      if (req.url === "/healthz") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "healthy", timestamp: Date.now() }));
        return;
      }

      // 2. Reject malformed request targets before bridging (never throw).
      if (!isSafeRequestTarget(req.url)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Bad Request");
        return;
      }

      // 3. Try static asset serving
      if (tryServeStaticFile(req, res, { staticDirs, compression })) {
        return;
      }

      // 4. Dispatch to Web standard request handler
      const webRequest = nodeReqToWebRequest(req, `${host}:${port}`);
      const webResponse = await handleRequest(webRequest);

      // 5. Send back Web response (with content negotiation)
      await sendWebResponseToNode(webResponse, res, compression);
    } catch (err) {
      console.error("[Frost Adapter Node] Uncaught request error:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end("Internal Server Error");
      }
    }
  });

  // Handle graceful shutdown
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  return server;
}

