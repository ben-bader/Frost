// Verify bento playground: layout, sequence timing, dialog, retrigger.
// Self-contained headless-Edge CDP check (scratch/ tooling was removed).
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const base = process.argv[2] ?? "http://localhost:3000";
const port = "9230";
const profile = path.resolve("scratch/edge-profile-bento");
fs.mkdirSync(profile, { recursive: true });
const edge = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,900",
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

await send("Page.navigate", { url: base + "/playground" });
await sleep(600);
console.log("tiles:", await evalJs(`document.querySelectorAll('section').length`));
console.log("scroll at load:", await evalJs(`document.documentElement.scrollHeight > innerHeight`));

// mid-sequence: terminal partially printed, dialog hidden
console.log(
  "t=600ms lines:",
  await evalJs(`document.querySelectorAll('[class*="font-mono"] > div').length`),
);
console.log("dialog at 600ms:", await evalJs(`!!document.querySelector('[role="alertdialog"]')`));
console.log(
  "chip at 600ms:",
  await evalJs(`document.querySelectorAll('header span:last-child')[2]?.textContent`),
);

// after sequence (~3s)
await sleep(2600);
console.log("dialog after seq:", await evalJs(`!!document.querySelector('[role="alertdialog"]')`));
console.log(
  "browser chip:",
  await evalJs(
    `[...document.querySelectorAll('section header')].map(h=>h.textContent.trim()).join(' | ')`,
  ),
);
console.log(
  "terminal chip:",
  await evalJs(
    `document.querySelectorAll('section')[1]?.querySelector('header span:last-child')?.textContent`,
  ),
);

// counter works
await evalJs(`[...document.querySelectorAll('button[aria-label="Increment"]')][0]?.click()`);
await sleep(150);
console.log("counter:", await evalJs(`document.querySelector('[aria-live]')?.textContent`));

// dismiss dialog + chip hides
await evalJs(
  `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Dismiss')?.click()`,
);
await sleep(200);
console.log(
  "after dismiss dialog:",
  await evalJs(`!!document.querySelector('[role="alertdialog"]')`),
);
console.log(
  "after dismiss chip:",
  await evalJs(
    `[...document.querySelectorAll('section header')].map(h=>h.textContent.trim()).join(' | ')`,
  ),
);

// retrigger via Trigger error
await evalJs(
  `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Trigger error'))?.click()`,
);
await sleep(400);
console.log(
  "retrigger dialog@400ms:",
  await evalJs(`!!document.querySelector('[role="alertdialog"]')`),
);
await sleep(3000);
console.log(
  "retrigger dialog@3.4s:",
  await evalJs(`!!document.querySelector('[role="alertdialog"]')`),
);

// mobile 390px: stacked + scroll allowed
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await send("Page.navigate", { url: base + "/playground" });
await sleep(1500);
console.log(
  "390 scroll allowed:",
  await evalJs(
    `document.documentElement.scrollHeight > innerHeight || document.querySelector('section')?.scrollHeight > innerHeight`,
  ),
);
console.log(
  "390 tile minH:",
  await evalJs(
    `[...document.querySelectorAll('section')].map(s=>Math.round(s.getBoundingClientRect().height)).join(',')`,
  ),
);
console.log(
  "390 hScroll:",
  await evalJs(`document.documentElement.scrollWidth > document.documentElement.clientWidth`),
);

// short desktop 1280x720
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: base + "/playground" });
await sleep(1500);
console.log("720 scroll:", await evalJs(`document.documentElement.scrollHeight > innerHeight`));
console.log("console errors:", errors.length ? errors : "none");
ws.close();
await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => {});
killEdge();
