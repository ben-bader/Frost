#!/usr/bin/env node
// Renders every CLI UI frame with clearly labeled FAKE data so the look
// can be reviewed in a real terminal: pnpm cli:preview
// Nothing here is real output — all values are fixtures.
import * as ui from "../packages/create-frost-app/ui.mjs";

const BASE = {
  color: "true",
  unicode: true,
  emoji: true,
  columns: 100,
  narrow: false,
  interactive: false,
};

function section(title) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

function frame1() {
  const lines = [];
  const name = "my-app";
  const header = ui.brandHeader(
    [{ text: "Frost", tone: "bold" }],
    [{ text: "create-frost-app 0.1.1", tone: "dim" }],
  );
  if (header.length) lines.push(...header);
  lines.push("");
  lines.push(ui.railTitle("Create a new Frost app"));
  lines.push(ui.railBlank());
  lines.push(ui.railField("Project name", [{ text: name, tone: "bold" }]));
  lines.push(ui.railField("Template", [{ text: "starter", tone: "bold" }]));
  lines.push(
    ui.railField("Package manager", [
      { text: "npm", tone: "bold" },
      { text: " (detected)", tone: "dim" },
    ]),
  );
  lines.push(ui.railBlank());
  const step = (e, text) =>
    ui.mint(ui.sym("diamond")) + "  " + (ui.emoji(e) ? e + "  " : "") + text;
  lines.push(step("📁", `Created ${ui.white("starter")} ${ui.dim("in")} ${ui.white("./" + name)}`));
  lines.push(step("🌱", "Initialized git repository"));
  lines.push(step("📦", `Installed dependencies with npm  ${ui.dim("8.4s")}`));
  lines.push(ui.railBlank());
  lines.push(ui.railDone((ui.emoji("🚀") ? "🚀  " : "") + "Your app is ready"));
  lines.push("");
  const cmdRow = (cmd, desc) => ({
    segs: [
      { text: ui.padEnd(cmd, 17), tone: "bold" },
      { text: desc, tone: "dim" },
    ],
  });
  lines.push(
    ...ui.roundedBox("Next steps", [
      { segs: [{ text: `cd ${name}`, tone: "bold" }] },
      cmdRow("npm run dev", "start the dev server"),
      cmdRow("npm run build", "production build"),
      cmdRow("npm start", "serve the production build"),
    ]),
  );
  lines.push("");
  return lines.join("\n");
}

function frame2() {
  return ui
    .cliHeader({
      version: "0.1.1",
      appName: "my-app",
      rows: {
        local: "http://localhost:3000/",
        network: "http://192.168.1.20:3000/",
        pages: 3,
        api: 1,
        envFiles: [".env", ".env.local"],
        watching: true,
      },
      readyMs: 1234,
    })
    .concat([
      `${ui.mint(ui.sym("diamond"))}  ${ui.dim("GET")}  ${ui.white("/")}  ${ui.mint("200")}  ${ui.dim("12 ms")}`,
      `${ui.mint(ui.sym("diamond"))}  ${ui.dim("GET")}  ${ui.white("/hello/world")}  ${ui.mint("200")}  ${ui.dim("48 ms")}`,
      `${ui.mint(ui.sym("diamond"))}  ${ui.dim("POST")}  ${ui.white("/api/submit")}  ${ui.amber("422")}  ${ui.dim("9 ms")}`,
    ])
    .join("\n");
}

function frame3() {
  const err = ui.formatErrorBlock(
    {
      name: "TypeError",
      message: "Cannot read properties of undefined (reading 'toUpperCase')",
      code: "FROST_E_LOADER",
      location: "D:/fake/my-app/src/app/hello/[name]/page.tsx:25:24",
      route: "/hello/world",
      runtime: "server",
      frame: [
        { line: 23, text: "export async function loader({ params }) {" },
        { line: 24, text: "  const name = params.name;" },
        { line: 25, text: "  return { title: name.toUpperCase() };", markerColumn: 24 },
        { line: 26, text: "}" },
      ],
      stack: "TypeError: fake\n    at loader (page.tsx:25:24)",
    },
    { rootDir: "D:/fake/my-app" },
  );
  const warn = ui.formatErrorBlock({
    severity: "warning",
    message: "Port 3000 is already in use, trying 3001...",
  });
  return err + warn;
}

console.log("PREVIEW (fake data)");
console.log("All values below are fixtures — not real command output.\n");

ui.configureUi({ ...BASE });
section("FRAME 1 — create-frost-app");
console.log(frame1());

section("FRAME 2 — frost dev");
console.log(frame2());

section("FRAME 3 — error + warning");
process.stderr.write(frame3());

section("ASCII mode (--ascii)");
ui.configureUi({ ...BASE, unicode: false, emoji: false });
console.log(frame1());
console.log(frame2());

section("Narrow terminal (50 cols)");
ui.configureUi({ ...BASE, columns: 50, narrow: true });
console.log(frame1());
console.log(frame2());

section("NO_COLOR");
ui.configureUi({ ...BASE, color: "none" });
console.log(frame1());
console.log(frame2());
process.stderr.write(frame3());
