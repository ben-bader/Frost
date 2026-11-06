import { describe, it, expect, afterAll } from "vitest";
import * as http from "node:http";
import { createNodeServer } from "../server.js";
import { getMimeType } from "../mime.js";

describe("Adapter Node", () => {
  let server: http.Server;
  let serverUrl: string;

  it("resolves common mime types correctly", () => {
    expect(getMimeType("index.html")).toBe("text/html; charset=utf-8");
    expect(getMimeType("app.js")).toBe("text/javascript; charset=utf-8");
    expect(getMimeType("styles.css")).toBe("text/css; charset=utf-8");
    expect(getMimeType("data.json")).toBe("application/json; charset=utf-8");
    expect(getMimeType("unknown.xyz")).toBe("application/octet-stream");
  });

  it("starts Node HTTP server and responds to healthz and web requests", async () => {
    server = createNodeServer({
      port: 0, // OS assigns random available port
      host: "127.0.0.1",
      handleRequest: async (req) => {
        const url = new URL(req.url);
        if (url.pathname === "/greeting") {
          return new Response("Hello from Frost Node Adapter!", {
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Not Found", { status: 404 });
      },
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address() as { port: number; address: string };
    serverUrl = `http://127.0.0.1:${address.port}`;

    // 1. Test /healthz
    const healthRes = await fetch(`${serverUrl}/healthz`);
    expect(healthRes.status).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("healthy");

    // 2. Test /greeting
    const greetingRes = await fetch(`${serverUrl}/greeting`);
    expect(greetingRes.status).toBe(200);
    const greetingText = await greetingRes.text();
    expect(greetingText).toBe("Hello from Frost Node Adapter!");
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });
});

