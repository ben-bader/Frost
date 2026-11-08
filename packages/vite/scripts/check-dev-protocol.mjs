#!/usr/bin/env node
/**
 * Dev-protocol smoke check against examples/starter.
 *
 * Starts a real Vite dev server with the Frost plugin, connects a
 * simulated WebSocket client, edits files of each change class, and
 * asserts the expected frost:* message. Run from the repo root AFTER
 * `pnpm build` (uses package dist output):
 *
 *   node packages/vite/scripts/check-dev-protocol.mjs
 *
 * Exits non-zero on the first failed assertion. All file mutations are
 * reverted before exit.
 */
import { createServer } from "vite";
import { frost } from "../dist/index.js";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const APP_ROOT = path.join(ROOT, "examples/starter");
const PORT = 54995;

const events = [];
let ws;

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${PORT}/`, "vite-hmr");
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(String(ev.data));
        if (m.type === "custom" && m.event) events.push({ event: m.event, data: m.data });
      } catch {}
    };
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("ws connect failed"));
  });
}

async function waitFor(event, since = 0, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hit = events.slice(since).find((e) => e.event === event);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`timeout waiting for ${event}; saw ${events.map((e) => e.event).join(",")}`);
}

const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (err) {
    results.push(`FAIL  ${name}: ${err.message}`);
  }
}

const server = await createServer({
  root: APP_ROOT,
  logLevel: "silent",
  server: { port: PORT, strictPort: true },
  plugins: [frost({})],
});
await server.listen();
await fetch(`http://localhost:${PORT}/`).then((r) => r.text());
await connect();

const cssFile = path.join(APP_ROOT, "src/styles/app.css");
const cssOrig = await fs.readFile(cssFile, "utf8");
const compFile = path.join(APP_ROOT, "src/components/Button.tsx");
const compOrig = await fs.readFile(compFile, "utf8");
const srvFile = path.join(APP_ROOT, "src/__devcheck.server.ts");
const routeDir = path.join(APP_ROOT, "src/app/__devcheck");

try {
  await check("css change -> frost:css-update", async () => {
    const mark = events.length;
    await fs.writeFile(cssFile, cssOrig + "\n/* dev-check */\n");
    await waitFor("frost:css-update", mark);
    await fs.writeFile(cssFile, cssOrig);
    await settle();
  });

  await check("component change -> no frost:reload", async () => {
    const mark = events.length;
    await fs.writeFile(compFile, compOrig + "\n// dev-check\n");
    await settle(900);
    const reloads = events.slice(mark).filter((e) => e.event === "frost:reload");
    if (reloads.length) throw new Error(`unexpected reload: ${JSON.stringify(reloads[0].data)}`);
    await fs.writeFile(compFile, compOrig);
    await settle();
  });

  await check(".server module change -> frost:reload", async () => {
    await fs.writeFile(srvFile, "export const x = 1;\n");
    await settle(400); // let 'add' settle, then change it
    const mark = events.length;
    await fs.writeFile(srvFile, "export const x = 2;\n");
    await waitFor("frost:reload", mark);
  });

  await check("route add -> frost:routes-changed + frost:reload", async () => {
    await fs.mkdir(routeDir, { recursive: true });
    const mark = events.length;
    await fs.writeFile(
      path.join(routeDir, "page.tsx"),
      "export default function P() { return <h1>devcheck</h1>; }\n"
    );
    await waitFor("frost:routes-changed", mark);
    await waitFor("frost:reload", mark);
    const res = await fetch(`http://localhost:${PORT}/__devcheck`);
    if (res.status !== 200) throw new Error(`new route status ${res.status}`);
  });

  await check("loader error -> frost:error (FROST_E_LOADER)", async () => {
    const errDir = path.join(APP_ROOT, "src/app/__devcheckerr");
    await fs.mkdir(errDir, { recursive: true });
    await fs.writeFile(
      path.join(errDir, "page.tsx"),
      "export default function P() { return <h1>err</h1>; }\n" +
        "export async function loader() { throw new Error('dev-check loader boom'); }\n"
    );
    await settle(600);
    const mark = events.length;
    const res = await fetch(`http://localhost:${PORT}/__devcheckerr`);
    if (res.status !== 500) throw new Error(`expected 500, got ${res.status}`);
    const ev = await waitFor("frost:error", mark);
    if (ev.data?.code !== "FROST_E_LOADER") {
      throw new Error(`expected FROST_E_LOADER, got ${ev.data?.code}`);
    }
    await fs.rm(errDir, { recursive: true, force: true });
    await settle();
  });
} finally {
  await fs.rm(srvFile, { force: true });
  await fs.rm(routeDir, { recursive: true, force: true });
  await fs.rm(path.join(APP_ROOT, "src/app/__devcheckerr"), {
    recursive: true,
    force: true,
  });
  await fs.writeFile(cssFile, cssOrig);
  await fs.writeFile(compFile, compOrig);
  ws?.close();
  await server.close();
}

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL"));
process.exit(failed.length ? 1 : 0);
