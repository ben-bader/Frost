import { createServer } from "vite";
import { frost } from "../packages/vite/dist/index.js";
import path from "node:path";

const root = path.resolve("packages/vite/test-fixtures/dev-app");
const s = await createServer({
  root,
  logLevel: "silent",
  server: { port: 54992, strictPort: true },
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
const widget = path.join(root, "src/lib/Widget.tsx");
const cg = s.environments?.client?.moduleGraph;
const sg = s.environments?.ssr?.moduleGraph;
const norm = widget.replace(/\\/g, "/");
console.log(
  "client keys w/ Widget:",
  [...(cg?.fileToModulesMap?.keys() ?? [])].filter((f) => f.includes("Widget")),
);
console.log(
  "ssr keys w/ Widget:",
  [...(sg?.fileToModulesMap?.keys() ?? [])].filter((f) => f.includes("Widget")),
);
console.log(
  "lookup client norm:",
  cg?.getModulesByFile(norm)?.size,
  "raw:",
  cg?.getModulesByFile(widget)?.size,
);
console.log("lookup ssr norm:", sg?.getModulesByFile(norm)?.size);
console.log("widget path:", widget);
await s.close();
