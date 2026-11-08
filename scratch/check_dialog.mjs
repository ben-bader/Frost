// Verify: GitHub header link + Run-locally dialog on the home page.
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const base = process.argv[2] ?? "http://localhost:3000";
const port = "9231";
const profile = path.resolve("scratch/edge-profile-dlg");
fs.mkdirSync(profile, { recursive: true });
const edge = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,800",
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const killEdge = () => {
  try {
    execFileSync("taskkill", ["/pid", String(edge.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {}
};
process.once("exit", killEdge);

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no CDP");
}
await wsUrl();
const tab = await (
  await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })
).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pend = new Map();
const errors = [];
const send = (m, p = {}) =>
  new Promise((res) => {
    const i = ++id;
    pend.set(i, res);
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });
ws.addEventListener("message", (e) => {
  const d = JSON.parse(e.data);
  if (d.id && pend.has(d.id)) {
    pend.get(d.id)(d.result ?? d.error);
    pend.delete(d.id);
  }
  if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.text);
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error")
    errors.push(d.params.args?.map((a) => a.value).join(" "));
});
await send("Page.enable");
await send("Runtime.enable");
const evalJs = async (expr) =>
  (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }))
    ?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Page.navigate", { url: base + "/" });
await sleep(2000);

// Header link
console.log(
  "gh link:",
  await evalJs(
    `JSON.stringify([...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Get started') && (({href,target,rel})=>({href,target,rel}))(document.querySelector('a[aria-label*="GitHub"]')))`,
  ),
);

// Open dialog via button
await evalJs(
  `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Run it locally'))?.click()`,
);
await sleep(400);
console.log("dialog open:", await evalJs(`document.querySelector('dialog')?.open`));
console.log(
  "dialog title:",
  await evalJs(`document.getElementById('run-locally-title')?.textContent`),
);
console.log("steps:", await evalJs(`document.querySelectorAll('dialog code').length`));
console.log(
  "first cmd:",
  await evalJs(`document.querySelector('dialog code')?.textContent?.trim()`),
);
console.log(
  "intro:",
  await evalJs(
    `document.querySelector('dialog .space-y-5 p, dialog div p')?.textContent?.slice(0,90)`,
  ),
);
console.log(
  "activeEl in dialog:",
  await evalJs(`document.querySelector('dialog')?.contains(document.activeElement)`),
);

// Esc closes + focus returns
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Escape",
  code: "Escape",
  windowsVirtualKeyCode: 27,
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Escape",
  code: "Escape",
  windowsVirtualKeyCode: 27,
});
await sleep(300);
console.log("after Esc:", await evalJs(`document.querySelector('dialog')?.open`));
console.log(
  "focus back:",
  await evalJs(`document.activeElement?.textContent?.includes('Run it locally')`),
);

// reopen, backdrop click closes
await evalJs(
  `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Run it locally'))?.click()`,
);
await sleep(300);
await evalJs(
  `document.querySelector('dialog').dispatchEvent(new MouseEvent('click',{bubbles:true}))`,
);
// dispatch on dialog element itself simulates backdrop
await sleep(200);
console.log("after backdrop click:", await evalJs(`document.querySelector('dialog')?.open`));

// copy-all + per-command copy (clipboard may fail headless — just ensure no throw)
await evalJs(
  `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Run it locally'))?.click()`,
);
await sleep(300);
console.log(
  "copy btns:",
  await evalJs(`document.querySelectorAll('dialog button[aria-label^="Copy"]').length`),
);

// mobile margin check
await send("Emulation.setDeviceMetricsOverride", {
  width: 360,
  height: 740,
  deviceScaleFactor: 2,
  mobile: true,
});
await sleep(400);
console.log(
  "360 dialog w:",
  await evalJs(`document.querySelector('dialog')?.getBoundingClientRect().width`),
);
console.log("console errors:", errors.length ? errors : "none");
ws.close();
await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => {});
killEdge();
