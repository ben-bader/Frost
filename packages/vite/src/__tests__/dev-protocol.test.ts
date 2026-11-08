import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { frost } from "../plugin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.resolve(__dirname, "../../test-fixtures/dev-app");

interface FrostEvent {
  event: string;
  data: unknown;
}

interface FakeClient {
  events: FrostEvent[];
  close: () => void;
}

function connectDevClient(port: number): Promise<FakeClient> {
  return new Promise((resolve, reject) => {
    const events: FrostEvent[] = [];
    let closed = false;
    let attempt = 0;

    const open = () => {
      // Node 22+ global WebSocket — simulates the browser dev client,
      // including Vite's automatic reconnect after a server restart.
      const ws = new WebSocket(`ws://localhost:${port}/`, "vite-hmr");
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            event?: string;
            data?: unknown;
          };
          if (msg.type === "custom" && msg.event) {
            events.push({ event: msg.event, data: msg.data });
          }
        } catch {
          // non-JSON frame
        }
      };
      ws.onopen = () => {
        attempt = 0;
        if (events.length === 0 && attempt === 0) {
          // first successful connection resolves the outer promise once
        }
        resolveOnce();
      };
      ws.onclose = () => {
        if (closed) return;
        // Backoff reconnect like the real Vite client.
        const delay = Math.min(1000, 100 * 2 ** attempt++);
        setTimeout(open, delay);
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          // already closed
        }
      };
    };

    let resolved = false;
    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        resolve({
          events,
          close: () => {
            closed = true;
          },
        });
      }
    };

    open();
    // If the first connection never opens, fail fast.
    setTimeout(() => {
      if (!resolved) reject(new Error("ws connect failed"));
    }, 5000);
  });
}

async function waitForEvent(
  client: FakeClient,
  event: string,
  timeoutMs = 5000,
  since = 0,
): Promise<FrostEvent> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = client.events.slice(since).find((e) => e.event === event);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(
    `Timed out waiting for frost event "${event}". Saw: ${client.events
      .map((e) => e.event)
      .join(", ")}`,
  );
}

async function waitForAbsence(
  client: FakeClient,
  event: string,
  windowMs = 800,
  since = 0,
): Promise<void> {
  await new Promise((r) => setTimeout(r, windowMs));
  expect(client.events.slice(since).some((e) => e.event === event)).toBe(false);
}

const settle = () => new Promise((r) => setTimeout(r, 400));

const touch = async (file: string, contents?: string) => {
  if (contents !== undefined) {
    await fs.writeFile(file, contents);
  } else {
    const now = new Date();
    await fs.utimes(file, now, now);
  }
};

describe("Frost dev protocol (F19/F5)", () => {
  let server: ViteDevServer;
  let port: number;
  let client: FakeClient;
  const configFile = path.join(FIXTURE_ROOT, "frost.config.ts");

  beforeAll(async () => {
    server = await createServer({
      root: FIXTURE_ROOT,
      logLevel: "silent",
      server: { port: 54990, strictPort: true, hmr: { port: undefined } },
      plugins: [frost({}, { configFile })],
    });
    await server.listen();
    const address = server.httpServer?.address();
    port = typeof address === "object" && address ? address.port : 0;
    expect(port).toBeGreaterThan(0);

    // Populate SSR + client module graphs like a real browser session.
    await fetch(`http://localhost:${port}/`).then((r) => r.text());
    await fetch(`http://localhost:${port}/styled`).then((r) => r.text());
    // The browser fetches each imported module after the entry; do the
    // same so the client module graph contains the component tree.
    for (const mod of ["src/app/page.tsx", "src/app/styled/page.tsx", "src/lib/Widget.tsx"]) {
      await fetch(`http://localhost:${port}/${mod}`);
    }
    await fetch(
      `http://localhost:${port}/@frost/client?file=${encodeURIComponent(
        path.join(FIXTURE_ROOT, "src/app/page.tsx"),
      )}`,
    );

    client = await connectDevClient(port);
  }, 30000);

  afterAll(async () => {
    client?.close();
    await server?.close();
  });

  it("serves the dev client module", async () => {
    const res = await fetch(`http://localhost:${port}/@frost/dev-client`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("frost:error");
    expect(body).toContain("frost:css-update");
  });

  it("injects the dev client into SSR html", async () => {
    const html = await fetch(`http://localhost:${port}/`).then((r) => r.text());
    expect(html).toContain("/@frost/dev-client");
  });

  it("sends frost:css-update for stylesheet changes", async () => {
    const cssFile = path.join(FIXTURE_ROOT, "src/app/styled/style.css");
    const mark = client.events.length;
    await touch(cssFile, ".widget { color: rgb(1, 2, 3); }\n");
    const ev = await waitForEvent(client, "frost:css-update", 5000, mark);
    expect((ev.data as { file?: string }).file).toContain("style.css");
    await touch(cssFile, ".widget { color: rgb(10, 20, 30); }\n");
  });

  it("sends frost:reload for API route changes", async () => {
    const apiFile = path.join(FIXTURE_ROOT, "src/api/ping/route.ts");
    const original = await fs.readFile(apiFile, "utf8");
    const mark = client.events.length;
    await touch(apiFile, original + "\n// touch\n");
    const ev = await waitForEvent(client, "frost:reload", 5000, mark);
    expect((ev.data as { reason?: string }).reason).toBe("server-module");
    await touch(apiFile, original);
    await settle(); // let the restore's watcher event drain
  });

  it("sends frost:reload for .server module changes", async () => {
    const serverFile = path.join(FIXTURE_ROOT, "src/lib/secret.server.ts");
    const original = await fs.readFile(serverFile, "utf8");
    const mark = client.events.length;
    await touch(serverFile, original + "\n// touch\n");
    await waitForEvent(client, "frost:reload", 5000, mark);
    await touch(serverFile, original);
    await settle();
  });

  it("sends frost:routes-changed + frost:reload when a route is added", async () => {
    const dir = path.join(FIXTURE_ROOT, "src/app/added-route");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, "page.tsx");
    await fs.writeFile(file, "export default function Added() { return <h1>added</h1>; }\n");
    const mark = client.events.length;
    await waitForEvent(client, "frost:routes-changed", 5000, mark);
    await waitForEvent(client, "frost:reload", 5000, mark);
    // New route is actually served after invalidation.
    const res = await fetch(`http://localhost:${port}/added-route`);
    expect(res.status).toBe(200);
    await fs.rm(dir, { recursive: true, force: true });
    await settle(); // unlink also emits routes-changed + reload
  });

  it("does not send frost:reload for pure client component changes", async () => {
    const widgetFile = path.join(FIXTURE_ROOT, "src/lib/Widget.tsx");
    const original = await fs.readFile(widgetFile, "utf8");
    const mark = client.events.length;
    await touch(widgetFile, original.replace("widget", "widget!"));
    await waitForAbsence(client, "frost:reload", 800, mark);
    // Assert no NEW frost:reload arrived during the window.
    const reloads = client.events.slice(mark).filter((e) => e.event === "frost:reload");
    expect(reloads).toEqual([]);
    await touch(widgetFile, original);
  });

  it("emits frost:error with a structured report when a loader throws", async () => {
    const mark = client.events.length;
    const res = await fetch(`http://localhost:${port}/broken-loader`);
    expect(res.status).toBe(500);
    const ev = await waitForEvent(client, "frost:error", 5000, mark);
    const report = ev.data as {
      code?: string;
      runtime?: string;
      message?: string;
      name?: string;
    };
    expect(report.code).toBe("FROST_E_LOADER");
    expect(report.runtime).toBe("server");
    expect(report.message).toContain("loader exploded");
  });

  it("sends frost:error-clear after a subsequent successful render", async () => {
    const mark = client.events.length;
    await fetch(`http://localhost:${port}/`).then((r) => r.text());
    await waitForEvent(client, "frost:error-clear", 5000, mark);
  });

  it("restarts in-process when frost.config.ts changes", async () => {
    const original = await fs.readFile(configFile, "utf8");
    await touch(configFile, original.replace("54991", "54992") + "\n// restart trigger\n");
    // Config restart debounce is 300ms + server restart; allow generous time.
    const mark = client.events.length;
    const ev = await waitForEvent(client, "frost:reload", 10000, mark);
    expect((ev.data as { reason?: string }).reason).toBe("config");
    // Server is still serving after the restart.
    const res = await fetch(`http://localhost:${port}/`);
    expect(res.status).toBe(200);
    await touch(configFile, original);
  }, 20000);
});
