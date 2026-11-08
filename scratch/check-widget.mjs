import { createServer } from "vite";
import { frost } from "../packages/vite/dist/index.js";
import path from "node:path";
import fs from "node:fs/promises";

const root = path.resolve("packages/vite/test-fixtures/dev-app");
const s = await createServer({
  root,
  logLevel: "silent",
  server: { port: 54994, strictPort: true },
  plugins: [frost({}, {})],
});
await s.listen();
const port = s.httpServer.address().port;
await fetch(`http://localhost:${port}/`).then((r) => r.text());
await fetch(`http://localhost:${port}/styled`).then((r) => r.text());
for (const mod of ["src/app/page.tsx", "src/app/styled/page.tsx", "src/lib/Widget.tsx"]) {
  await fetch(`http://localhost:${port}/${mod}`);
}
await fetch(
  `http://localhost:${port}/@frost/client?file=${encodeURIComponent(
    path.join(root, "src/app/page.tsx"),
  )}`,
);

const ws = new WebSocket(`ws://localhost:${port}/`, "vite-hmr");
ws.onmessage = (ev) => {
  try {
    const m = JSON.parse(String(ev.data));
    if (m.type === "custom") console.log("CUSTOM", m.event, JSON.stringify(m.data));
  } catch {}
};
await new Promise((r) => setTimeout(r, 400));

const widget = path.join(root, "src/lib/Widget.tsx");
const orig = await fs.readFile(widget, "utf8");
console.log("touching Widget…");
await fs.writeFile(widget, orig.replace("widget", "widget!"));
await new Promise((r) => setTimeout(r, 1500));
await fs.writeFile(widget, orig);
await new Promise((r) => setTimeout(r, 800));
ws.close();
await s.close();
process.exit(0);
