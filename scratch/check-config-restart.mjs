import { createServer } from "vite";
import { frost } from "../packages/vite/dist/index.js";
import path from "node:path";
import fs from "node:fs/promises";

const root = path.resolve("packages/vite/test-fixtures/dev-app");
const configFile = path.join(root, "frost.config.ts");
const s = await createServer({
  root,
  logLevel: "info",
  server: { port: 54993, strictPort: true },
  plugins: [frost({}, { configFile })],
});
await s.listen();
const port = s.httpServer.address().port;
console.log("listening", port);

const ws = new WebSocket(`ws://localhost:${port}/`, "vite-hmr");
ws.onmessage = (ev) => {
  try {
    const m = JSON.parse(String(ev.data));
    if (m.type === "custom") console.log("CUSTOM", m.event, JSON.stringify(m.data)?.slice(0, 200));
    else console.log("MSG", m.type);
  } catch {
    console.log("RAW", String(ev.data).slice(0, 80));
  }
};
ws.onclose = () => console.log("WS CLOSED");
ws.onerror = (e) => console.log("WS ERR", e.message ?? e);
await new Promise((r) => setTimeout(r, 500));

const orig = await fs.readFile(configFile, "utf8");
console.log("touching config…");
await fs.writeFile(configFile, orig + "\n// trigger\n");
await new Promise((r) => setTimeout(r, 6000));
try {
  const res = await fetch(`http://localhost:${port}/`);
  console.log("after restart status", res.status);
} catch (e) {
  console.log("fetch after restart failed:", e.message);
}
// Simulate browser reconnect.
await new Promise((r) => setTimeout(r, 800));
const ws2 = new WebSocket(`ws://localhost:${port}/`, "vite-hmr");
ws2.onmessage = (ev) => {
  try {
    const m = JSON.parse(String(ev.data));
    if (m.type === "custom")
      console.log("RECONNECT CUSTOM", m.event, JSON.stringify(m.data)?.slice(0, 120));
  } catch {}
};
await new Promise((r) => setTimeout(r, 1500));
// Check for duplicate watcher registration: touch css, count events.
await fs.writeFile(path.join(root, "src/app/styled/style.css"), ".widget { color: rgb(9,9,9); }\n");
await new Promise((r) => setTimeout(r, 1200));
await fs.writeFile(configFile, orig);
ws.close();
await s.close();
process.exit(0);
