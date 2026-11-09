import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error — ui.mjs is plain JS shipped in the package
import * as ui from "../../ui.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(__dirname, "..", "..", "test", "golden", "frame1.txt");

/**
 * Renders FRAME 1 exactly as bin.js composes it for a completed scaffold
 * (starter template, npm detected, git enabled, install finished).
 * Fixed fake values only — this is a golden fixture, not real output.
 */
function renderFrame1(): string {
  const lines: string[] = [];
  const name = "my-app";
  const template = "starter";
  const pm = "npm";
  const version = "0.1.1";

  const header = ui.brandHeader(
    [{ text: "Frost", tone: "bold" }],
    [{ text: `create-frost-app ${version}`, tone: "dim" }],
  );
  if (header.length) lines.push(...header);
  lines.push("");

  lines.push(ui.railTitle("Create a new Frost app"));
  lines.push(ui.railBlank());
  lines.push(ui.railField("Project name", [{ text: name, tone: "bold" }]));
  lines.push(ui.railField("Template", [{ text: template, tone: "bold" }]));
  lines.push(
    ui.railField("Package manager", [
      { text: pm, tone: "bold" },
      { text: " (detected)", tone: "dim" },
    ]),
  );
  lines.push(ui.railBlank());

  const step = (e: string, text: string) =>
    ui.mint(ui.sym("diamond")) + "  " + (ui.emoji(e) ? e + "  " : "") + text;
  lines.push(
    step("📁", `Created ${ui.white(template)} ${ui.dim("in")} ${ui.white("./" + name)}`),
  );
  lines.push(step("🌱", "Initialized git repository"));
  lines.push(
    step("📦", `Installed dependencies with ${pm}  ${ui.dim("8.4s")}`),
  );
  lines.push(ui.railBlank());
  lines.push(ui.railDone((ui.emoji("🚀") ? "🚀  " : "") + "Your app is ready"));
  lines.push("");

  const cmds = {
    dev: "npm run dev",
    build: "npm run build",
    start: "npm start",
    install: "npm install",
  };
  const cmdRow = (cmd: string, desc: string) => ({
    segs: [
      { text: ui.padEnd(cmd, 17), tone: "bold" },
      { text: desc, tone: "dim" },
    ],
  });
  const rows = [
    { segs: [{ text: `cd ${name}`, tone: "bold" }] },
    cmdRow(cmds.dev, "start the dev server"),
    cmdRow(cmds.build, "production build"),
    cmdRow(cmds.start, "serve the production build"),
  ];
  lines.push(...ui.roundedBox("Next steps", rows));
  lines.push("");
  return lines.join("\n");
}

describe("FRAME 1 golden", () => {
  beforeAll(() => {
    ui.configureUi({
      color: "none",
      unicode: true,
      emoji: true,
      columns: 100,
      narrow: false,
      interactive: false,
    });
  });

  it("matches the golden file (ANSI stripped)", () => {
    const expected = fs.readFileSync(GOLDEN, "utf8");
    expect(ui.stripAnsi(renderFrame1())).toBe(expected);
  });
});
