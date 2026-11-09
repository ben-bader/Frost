import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  configureUi,
  displayWidth,
  ellipsize,
  formatErrorBlock,
  formatRequestLine,
  mint,
  dim,
  url,
  amber,
  red,
  white,
  errorBadge,
  warnBadge,
  brandHeader,
  roundedBox,
  startSpinner,
  stripAnsi,
  sym,
  type UiConfig,
} from "../cli-ui.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "..", "..", "test", "golden");

function setUi(overrides: Partial<UiConfig> = {}): void {
  configureUi({
    color: "none",
    unicode: true,
    emoji: true,
    columns: 100,
    narrow: false,
    interactive: false,
    ...overrides,
  });
}

const TRUECOLOR: UiConfig = {
  color: "true",
  unicode: true,
  emoji: true,
  columns: 100,
  narrow: false,
  interactive: true,
};

beforeEach(() => setUi());
afterEach(() => setUi());

describe("displayWidth / ellipsize", () => {
  it("counts wide chars and emoji as 2", () => {
    expect(displayWidth("abc")).toBe(3);
    expect(displayWidth("test")).toBe(4);
    expect(displayWidth("📦")).toBe(2);
    expect(displayWidth("\x1b[31mred\x1b[0m")).toBe(3);
  });

  it("ellipsizes from the right by default", () => {
    expect(ellipsize("abcdef", 4)).toBe("abc…");
  });

  it("ellipsizes from the left for paths", () => {
    expect(ellipsize("src/app/page.tsx", 10, true)).toBe("…/page.tsx");
  });
});

describe("palette helpers", () => {
  it("emit no ANSI when color is none", () => {
    setUi({ color: "none" });
    expect(mint("x")).toBe("x");
    expect(url("http://a")).toBe("http://a");
    expect(errorBadge("ERROR")).toBe("ERROR");
  });

  it("emit exact truecolor sequences for every palette color", () => {
    setUi(TRUECOLOR);
    const cases: [string, string, string][] = [
      [mint("m"), "38;2;16;232;200", "mint"],
      [url("u"), "38;2;76;201;240", "sky+underline"],
      [white("w"), "38;2;242;247;246", "white"],
      [dim("d"), "38;2;111;147;144", "dim"],
      [amber("a"), "38;2;255;184;107", "amber"],
      [red("r"), "38;2;255;77;94", "red"],
    ];
    for (const [out, seq] of cases) {
      expect(out).toContain(`\x1b[${seq}m`);
    }
    expect(url("u")).toContain("\x1b[4m"); // underline
    expect(errorBadge()).toContain("48;2;255;77;94"); // solid red bg
    expect(errorBadge()).toContain("38;2;26;5;8"); // badge fg #1a0508
    expect(warnBadge()).toContain("48;2;255;184;107"); // solid amber bg
    expect(warnBadge()).toContain("38;2;42;23;0"); // badge fg #2a1700
  });

  it("fall back to 256-color then 16-color", () => {
    setUi({ ...TRUECOLOR, color: "256" });
    expect(mint("m")).toContain("38;5;");
    setUi({ ...TRUECOLOR, color: "16" });
    expect(mint("m")).toContain("\x1b[");
    expect(mint("m")).not.toContain("38;");
  });
});

describe("symbols and ASCII fallback", () => {
  it("maps every symbol to its ASCII counterpart", () => {
    setUi({ unicode: false, emoji: false });
    expect(sym("block")).toBe("#");
    expect(sym("diamond")).toBe("*");
    expect(sym("prompt")).toBe(">");
    expect(sym("railTL")).toBe("+");
    expect(sym("railV")).toBe("|");
    expect(sym("railEnd")).toBe("+");
    expect(sym("boxTL")).toBe("+");
    expect(sym("boxTR")).toBe("+");
    expect(sym("boxBL")).toBe("+");
    expect(sym("boxBR")).toBe("+");
    expect(sym("hline")).toBe("-");
    expect(sym("arrow")).toBe(">");
    expect(sym("caret")).toBe(">");
    expect(sym("errRail")).toBe("|");
  });
});

describe("brandHeader", () => {
  it("renders the three-row logo block", () => {
    setUi();
    const lines = brandHeader(
      [{ text: "Frost", tone: "bold" }],
      [{ text: "create-frost-app 0.1.1", tone: "dim" }],
    );
    expect(lines).toHaveLength(3);
    expect(stripAnsi(lines[0]!)).toBe("  ▰▰▰▰▰");
    expect(stripAnsi(lines[1]!)).toBe(" ▰▰▰▰       Frost");
    expect(stripAnsi(lines[2]!)).toBe("▰▰          create-frost-app 0.1.1");
    // Row 2/3 text both start at column 12.
    expect(lines[1]!.indexOf("Frost")).toBe(12);
    expect(lines[2]!.indexOf("create-frost-app")).toBe(12);
  });

  it("hides the logo when narrow", () => {
    setUi({ narrow: true, columns: 50 });
    expect(brandHeader([], [])).toEqual([]);
  });
});

describe("roundedBox", () => {
  it("aligns borders for plain rows", () => {
    setUi();
    const lines = roundedBox("Next steps", [
      { segs: [{ text: "cd my-app", tone: "bold" }] },
      {
        segs: [
          { text: "npm run dev", tone: "bold" },
          { text: "  start the dev server", tone: "dim" },
        ],
      },
    ]);
    const plain = lines.map(stripAnsi);
    const width = displayWidth(plain[0]!);
    for (const l of plain) expect(displayWidth(l)).toBe(width);
    expect(plain[0]).toMatch(/^╭─ Next steps ─+╮$/);
    expect(plain[plain.length - 1]).toMatch(/^╰─+╯$/);
    // right border column is consistent
    for (const l of plain) expect(l.endsWith("│") || l.endsWith("╮") || l.endsWith("╯")).toBe(true);
  });

  it("handles wide characters without breaking alignment", () => {
    setUi();
    const lines = roundedBox("T", [
      { segs: [{ text: " test", tone: "bold" }] },
      { segs: [{ text: "x", tone: "plain" }] },
    ]);
    const plain = lines.map(stripAnsi);
    const width = displayWidth(plain[0]!);
    for (const l of plain) expect(displayWidth(l)).toBe(width);
  });

  it("shrinks to fit narrow terminals", () => {
    setUi({ narrow: true, columns: 50 });
    const lines = roundedBox("Next steps", [
      { segs: [{ text: "a-very-long-command-that-will-not-fit", tone: "bold" }] },
    ]);
    for (const l of lines.map(stripAnsi)) {
      expect(displayWidth(l)).toBeLessThanOrEqual(48);
    }
  });
});

describe("spinner", () => {
  it("prints the finished line exactly once on non-TTY", () => {
    setUi({ interactive: false });
    const writes: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: any) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const s = startSpinner(() => "working");
      s.stop("done line");
    } finally {
      process.stdout.write = orig;
    }
    expect(writes.join("")).toBe("done line\n");
  });

  it("animates in place on a TTY and restores the cursor", async () => {
    setUi({ ...TRUECOLOR, interactive: true });
    const writes: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: any) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const s = startSpinner((frame) => `${frame} working`);
      await new Promise((r) => setTimeout(r, 200));
      s.stop("finished");
    } finally {
      process.stdout.write = orig;
    }
    const out = writes.join("");
    expect(out).toContain("\x1b[?25l"); // hide cursor
    expect(out).toContain("\x1b[?25h"); // restore cursor
    expect(out).toContain("finished\n");
    expect(out).toContain("\r"); // in-place redraws
  });
});

describe("formatRequestLine", () => {
  it("returns null for asset requests", () => {
    setUi();
    expect(formatRequestLine({ method: "GET", path: "/assets/app.js", status: 200, ms: 3 })).toBeNull();
    expect(formatRequestLine({ method: "GET", path: "/", status: 200, ms: 3 })).not.toBeNull();
  });

  it("colors status by class", () => {
    setUi(TRUECOLOR);
    const ok = formatRequestLine({ method: "GET", path: "/", status: 200, ms: 5 })!;
    const nf = formatRequestLine({ method: "GET", path: "/x", status: 404, ms: 5 })!;
    const err = formatRequestLine({ method: "GET", path: "/y", status: 500, ms: 5 })!;
    expect(ok).toContain("38;2;16;232;200"); // mint 2xx
    expect(nf).toContain("38;2;255;184;107"); // amber 4xx
    expect(err).toContain("38;2;255;77;94"); // red 5xx
  });
});

describe("formatErrorBlock", () => {
  const report = {
    name: "TypeError",
    message: "Cannot read properties of undefined",
    code: "FROST_E_LOADER",
    location: "D:/proj/my-app/src/app/page.tsx:10:5",
    route: "/x",
    runtime: "server",
    frame: [
      { line: 9, text: "const a = 1;" },
      { line: 10, text: "boom();", markerColumn: 3 },
      { line: 11, text: "const b = 2;" },
    ],
    stack: "TypeError: x\n    at f (page.tsx:10:5)",
  };

  it("renders the FRAME 3 block with rail, badge, fields, and frame", () => {
    setUi({ color: "none" });
    const out = formatErrorBlock(report, { rootDir: "D:/proj/my-app" });
    const plain = stripAnsi(out);
    expect(plain.startsWith("\n")).toBe(true);
    expect(plain).toContain("┃  ERROR  TypeError");
    expect(plain).toContain("Cannot read properties of undefined");
    expect(plain).toContain("code     FROST_E_LOADER");
    expect(plain).toContain("my-app/src/app/page.tsx:10:5");
    expect(plain).toContain("route    /x");
    expect(plain).toContain("runtime  server");
    expect(plain).toContain("❯ 10 │  boom();");
    expect(plain).toContain("^");
    // stack hidden without verbose/debug
    expect(plain).not.toContain("at f (page.tsx:10:5)");
  });

  it("renders warnings with an amber WARN badge line", () => {
    setUi({ color: "none" });
    const out = formatErrorBlock({ severity: "warning", message: "heads up" });
    expect(stripAnsi(out)).toContain("WARN");
    expect(stripAnsi(out)).toContain("heads up");
  });

  it("shows the stack only when verbose", () => {
    setUi({ color: "none" });
    const out = formatErrorBlock(report, { verbose: true });
    expect(stripAnsi(out)).toContain("at f (page.tsx:10:5)");
  });
});

describe("golden frames", () => {
  function golden(name: string): string {
    return fs.readFileSync(path.join(GOLDEN_DIR, name), "utf8");
  }

  it("FRAME 3 error block matches golden (ANSI stripped)", () => {
    setUi({ color: "none" });
    const out = formatErrorBlock(
      {
        name: "TypeError",
        message: "Cannot read properties of undefined (reading 'toUpperCase')",
        code: "FROST_E_LOADER",
        location: "D:/golden/proj/src/app/hello/[name]/page.tsx:25:24",
        route: "/hello/world",
        runtime: "server",
        frame: [
          { line: 23, text: "export async function loader({ params }) {" },
          { line: 24, text: "  const name = params.name;" },
          { line: 25, text: "  return { title: name.toUpperCase() };", markerColumn: 24 },
          { line: 26, text: "}" },
        ],
      },
      { rootDir: "D:/golden/proj" },
    );
    expect(stripAnsi(out)).toBe(golden("frame3-error.txt"));
  });

  it("FRAME 3 warning block matches golden (ANSI stripped)", () => {
    setUi({ color: "none" });
    const out = formatErrorBlock({
      severity: "warning",
      message: "Port 3000 is already in use, trying 3001...",
    });
    expect(stripAnsi(out)).toBe(golden("frame3-warning.txt"));
  });
});
