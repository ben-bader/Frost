import * as http from "node:http";
import { isSafeRequestTarget, nodeReqToWebRequest, sendWebResponseToNode } from "./bridge.js";
import { tryServeStaticFile } from "./static.js";

export interface NodeServerOptions {
  port?: number;
  host?: string;
  staticDirs?: string[];
  handleRequest: (request: Request) => Promise<Response>;
}

export function createNodeServer(options: NodeServerOptions): http.Server {
  const { port = 3000, host = "localhost", staticDirs = [], handleRequest } = options;

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
      if (tryServeStaticFile(req, res, { staticDirs })) {
        return;
      }

      // 4. Dispatch to Web standard request handler
      const webRequest = nodeReqToWebRequest(req, `${host}:${port}`);
      const webResponse = await handleRequest(webRequest);

      // 4. Send back Web response
      await sendWebResponseToNode(webResponse, res);
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

