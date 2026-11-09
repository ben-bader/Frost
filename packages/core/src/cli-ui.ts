/**
 * cli-ui — shared terminal presentation for Frost CLIs.
 *
 * CANONICAL SOURCE: this file is transpiled verbatim (types stripped) to
 * packages/create-frost-app/ui.mjs by scripts/sync-cli-ui.mjs, so it must
 * only use APIs available in plain Node.js (no dependencies, no DOM).
 *
 * Palette (truecolor -> 256 -> 16 -> none):
 *   mint #10e8c8, deep teal #0b8f7e, sky #4cc9f0, white #f2f7f6,
 *   dim #6f9390, amber #ffb86b, red #ff4d5e.
 */

export type UiColorMode = "true" | "256" | "16" | "none";

export interface UiConfig {
  color: UiColorMode;
  /** Unicode symbols/box drawing (false => ASCII fallbacks). */
  unicode: boolean;
  /** Emoji allowed (false => stripped with their spacing). */
  emoji: boolean;
  columns: number;
  /** columns < 60: hide logo, shrink boxes, ellipsize paths. */
  narrow: boolean;
  /** stdout is a TTY: spinners/cursor control allowed. */
  interactive: boolean;
}

export interface UiFlagOverrides {
  noColor?: boolean;
  forceColor?: boolean;
  noEmoji?: boolean;
  ascii?: boolean;
}

const TOKENS: Record<string, [number, number, number]> = {
  mint: [0x10, 0xe8, 0xc8],
  teal: [0x0b, 0x8f, 0x7e],
  sky: [0x4c, 0xc9, 0xf0],
  white: [0xf2, 0xf7, 0xf6],
  dim: [0x6f, 0x93, 0x90],
  amber: [0xff, 0xb8, 0x6b],
  red: [0xff, 0x4d, 0x5e],
  badgeFg: [0x1a, 0x05, 0x08],
  warnBadgeFg: [0x2a, 0x17, 0x00],
};

// xterm-256 approximations for the 256-color fallback (computed once).
const ANSI256 = new Map<string, number>();
(function buildAnsi256() {
  for (const [name, [r, g, b]] of Object.entries(TOKENS)) {
    // cube level approximation: map each channel to the 6x6x6 cube (or grays)
    const levels = [0, 95, 135, 175, 215, 255];
    const gray = (v: number) => {
      // grayscale ramp 232..255 approximates neutral colors
      const g = Math.round(((v - 8) / 247) * 23) + 232;
      return Math.max(232, Math.min(255, g));
    };
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    let idx: number;
    if (spread < 12) {
      idx = gray((r + g + b) / 3);
    } else {
      const q = (v: number) => {
        let best = 0;
        let bd = Infinity;
        levels.forEach((l, i) => {
          const d = Math.abs(l - v);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        return best;
      };
      idx = 16 + 36 * q(r) + 6 * q(g) + q(b);
    }
    ANSI256.set(name, idx);
  }
})();

const ANSI16: Record<string, string> = {
  mint: "\x1b[36m",
  teal: "\x1b[36m",
  sky: "\x1b[36m",
  white: "\x1b[37m",
  dim: "\x1b[90m",
  amber: "\x1b[33m",
  red: "\x1b[31m",
  badgeFg: "\x1b[37m",
  warnBadgeFg: "\x1b[30m",
};

let current: UiConfig | null = null;

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v !== undefined && v !== "" && v !== "0" && v.toLowerCase() !== "false";
}

function localeIsUtf8(): boolean {
  const loc = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || "";
  if (!loc) return true; // unknown — assume UTF-8 capable
  return /utf-?8/i.test(loc);
}

function legacyWindowsConsole(): boolean {
  if (process.platform !== "win32") return false;
  // Windows Terminal, VS Code (TERM_PROGRAM), ConEmu, ANSICON all handle
  // Unicode box drawing; the legacy conhost does not.
  return !process.env.WT_SESSION && !process.env.TERM_PROGRAM && !process.env.ConEmuANSI && !process.env.ANSICON;
}

export function detectUiConfig(overrides: UiFlagOverrides = {}): UiConfig {
  const argv = process.argv.slice(2);
  const has = (flag: string) => argv.includes(flag);
  const noColor =
    overrides.noColor ?? (process.env.NO_COLOR !== undefined || has("--no-color"));
  const forceColor = overrides.forceColor ?? envFlag("FORCE_COLOR");
  const noEmoji =
    overrides.noEmoji ?? (envFlag("FROST_NO_EMOJI") || has("--no-emoji"));
  const ascii =
    overrides.ascii ??
    (envFlag("FROST_ASCII") ||
    has("--ascii") ||
    process.env.TERM === "dumb" ||
    !localeIsUtf8() ||
    legacyWindowsConsole());

  const stream = process.stdout as NodeJS.WriteStream;
  const interactive = Boolean(stream.isTTY);
  const depth = typeof stream.getColorDepth === "function" ? stream.getColorDepth() : 1;

  let color: UiColorMode = "none";
  if (forceColor) color = depth >= 24 ? "true" : "256";
  else if (!noColor && interactive) {
    if (depth >= 24) color = "true";
    else if (depth >= 4) color = "256";
    else color = "16";
  }

  let columns = 80;
  try {
    columns = stream.columns && stream.columns > 0 ? stream.columns : 80;
  } catch {
    columns = 80;
  }

  return {
    color,
    unicode: !ascii,
    emoji: !noEmoji,
    columns,
    narrow: columns < 60,
    interactive,
  };
}

export function configureUi(config: UiConfig): void {
  current = config;
}

export function getUi(): UiConfig {
  if (!current) current = detectUiConfig();
  return current;
}

// ---------- ANSI helpers ----------

function sgr(params: string): string {
  return `\x1b[${params}m`;
}

function paint(name: string, text: string, extra = ""): string {
  const cfg = getUi();
  if (cfg.color === "none" || text === "") return text;
  if (cfg.color === "true") {
    const [r, g, b] = TOKENS[name]!;
    return `${sgr(`38;2;${r};${g};${b}`)}${extra}${text}\x1b[0m`;
  }
  if (cfg.color === "256") {
    return `${sgr(`38;5;${ANSI256.get(name)}`)}${extra}${text}\x1b[0m`;
  }
  return `${ANSI16[name] ?? ""}${extra}${text}\x1b[0m`;
}

function bgPaint(name: string, text: string): string {
  const cfg = getUi();
  if (cfg.color === "none" || text === "") return text;
  const fgName = name === "red" ? "badgeFg" : name === "amber" ? "warnBadgeFg" : "white";
  const [r, g, b] = TOKENS[name]!;
  const bold = "\x1b[1m";
  if (cfg.color === "true") {
    const [fr, fg, fb] = TOKENS[fgName]!;
    return `${sgr(`48;2;${r};${g};${b}`)}${sgr(`38;2;${fr};${fg};${fb}`)}${bold} ${text} \x1b[0m`;
  }
  if (cfg.color === "256") {
    const bg = 16 + 36 * Math.round(r / 51) + 6 * Math.round(g / 51) + Math.round(b / 51);
    return `${sgr(`48;5;${bg}`)}${sgr(`38;5;${ANSI256.get(fgName)}`)}${bold} ${text} \x1b[0m`;
  }
  const bgCode = name === "red" ? "41" : "43";
  return `${sgr(`${bgCode};1;${name === "red" ? "37" : "30"}`)} ${text} \x1b[0m`;
}

export const mint = (t: string) => paint("mint", t);
export const teal = (t: string) => paint("teal", t);
export const sky = (t: string) => paint("sky", t, "\x1b[4m");
export const white = (t: string) => paint("white", t, "\x1b[1m");
export const bold = (t: string) => paint("white", t, "\x1b[1m");
export const dim = (t: string) => paint("dim", t);
export const amber = (t: string) => paint("amber", t);
export const red = (t: string) => paint("red", t);

export function errorBadge(text = "ERROR"): string {
  return bgPaint("red", text);
}
export function warnBadge(text = "WARN"): string {
  return bgPaint("amber", text);
}

// ---------- symbols ----------

const SYM = {
  block: "▰",
  diamond: "◇",
  prompt: "◆",
  railTL: "┌",
  railV: "│",
  railEnd: "└",
  boxTL: "╭",
  boxTR: "╮",
  boxBL: "╰",
  boxBR: "╯",
  hline: "─",
  arrow: "➜",
  caret: "❯",
  errRail: "┃",
  check: "✓",
};
const SYM_ASCII: Record<keyof typeof SYM, string> = {
  block: "#",
  diamond: "*",
  prompt: ">",
  railTL: "+",
  railV: "|",
  railEnd: "+",
  boxTL: "+",
  boxTR: "+",
  boxBL: "+",
  boxBR: "+",
  hline: "-",
  arrow: ">",
  caret: ">",
  errRail: "|",
  check: "x",
};

export function sym(name: keyof typeof SYM): string {
  const cfg = getUi();
  return cfg.unicode ? SYM[name] : SYM_ASCII[name];
}

export function emoji(text: string): string {
  return getUi().emoji ? text : "";
}

// ---------- width / truncation ----------

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const WIDE_RE =
  /[\u1100-\u115F\u2329\u232A\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F000}-\u{1FAFF}\u{20000}-\u{3FFFD}]/u;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

/** Display width: wide chars and emoji count as 2, ANSI ignored. */
export function displayWidth(s: string): number {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0) continue;
    w += WIDE_RE.test(ch) || cp > 0x1f000 ? 2 : 1;
  }
  return w;
}

export function padEnd(s: string, width: number): string {
  const w = displayWidth(s);
  return w >= width ? s : s + " ".repeat(width - w);
}

export function padStart(s: string, width: number): string {
  const w = displayWidth(s);
  return w >= width ? s : " ".repeat(width - w) + s;
}

/** Truncate to display width; "start" ellipsizes from the left (paths). */
export function ellipsize(s: string, width: number, fromStart = false): string {
  if (displayWidth(s) <= width) return s;
  if (width <= 1) return "…".slice(0, width);
  const plain = stripAnsi(s);
  const keep = width - 1;
  let out = "";
  let w = 0;
  const chars = [...plain];
  if (fromStart) {
    // keep the tail
    const tail: string[] = [];
    let tw = 0;
    for (let i = chars.length - 1; i >= 0 && tw + (WIDE_RE.test(chars[i]!) || (chars[i]!.codePointAt(0) ?? 0) > 0x1f000 ? 2 : 1) <= keep; i--) {
      tail.unshift(chars[i]!);
      tw += WIDE_RE.test(chars[i]!) || (chars[i]!.codePointAt(0) ?? 0) > 0x1f000 ? 2 : 1;
    }
    return "…" + tail.join("");
  }
  for (const ch of chars) {
    const cw = WIDE_RE.test(ch) || (ch.codePointAt(0) ?? 0) > 0x1f000 ? 2 : 1;
    if (w + cw > keep) break;
    out += ch;
    w += cw;
  }
  return out + "…";
}

// ---------- brand header ----------

export interface BrandText {
  text: string;
  tone?: "bold" | "dim" | "plain";
}

/**
 * Three-row Frost brand block. Row 2/3 text starts at column 12.
 * Returns [] when the terminal is narrow (logo hidden).
 */
export function brandHeader(row2: BrandText[], row3: BrandText[]): string[] {
  const cfg = getUi();
  if (cfg.narrow) return [];
  const block = sym("block");
  const tone = (t: BrandText) => {
    if (t.tone === "bold") return white(t.text);
    if (t.tone === "dim") return dim(t.text);
    return t.text;
  };
  const r1 = "  " + mint(block.repeat(5));
  const r2pre = " " + mint(block.repeat(4));
  const r2text = row2.map(tone).join("");
  const r3pre = mint(block.repeat(2));
  const r3text = row3.map(tone).join("");
  return [r1, padEnd(r2pre, 12) + r2text, padEnd(r3pre, 12) + r3text];
}

// ---------- rail card (create-frost-app summary) ----------

export function railTitle(title: string): string {
  return mint(sym("railTL")) + "  " + white(title);
}

export function railBlank(): string {
  return mint(sym("railV"));
}

export function railRow(marker: string, text: string): string {
  return mint(marker) + "  " + text;
}

export function railSeparator(): string {
  return mint(sym("railV"));
}

export function railDone(text: string): string {
  return mint(sym("railEnd")) + "  " + mint(text);
}

/** Config row inside the card: dim label padded to 15 + value segments. */
export function railField(label: string, value: BrandText[]): string {
  const labelText = padEnd(dim(label), 15) + "  ";
  const val = value
    .map((v) => (v.tone === "dim" ? dim(v.text) : v.tone === "bold" ? white(v.text) : v.text))
    .join("");
  return labelText + val;
}

// ---------- rounded box (next steps) ----------

export interface BoxLine {
  /** Plain-text segments (styled at render); widths use display text. */
  segs: Seg[];
}

interface Seg {
  text: string;
  tone?: "bold" | "dim" | "plain";
}

function segWidth(segs: Seg[]): number {
  return segs.reduce((n, s) => n + displayWidth(s.text), 0);
}

/** Truncate styled segments to a display width, appending an ellipsis. */
function truncateSegs(segs: Seg[], width: number): Seg[] {
  if (segWidth(segs) <= width) return segs;
  if (width <= 1) return [{ text: "…", tone: "plain" }];
  const out: Seg[] = [];
  let w = 0;
  const budget = width - 1;
  for (const seg of segs) {
    if (w >= budget) break;
    const sw = displayWidth(seg.text);
    if (w + sw <= budget) {
      out.push(seg);
      w += sw;
      continue;
    }
    // partial segment: keep whole chars that fit
    let kept = "";
    let kw = 0;
    for (const ch of seg.text) {
      const cw = WIDE_RE.test(ch) || (ch.codePointAt(0) ?? 0) > 0x1f000 ? 2 : 1;
      if (kw + cw > budget - w) break;
      kept += ch;
      kw += cw;
    }
    if (kept) out.push({ text: kept, tone: seg.tone });
    w += kw;
    break;
  }
  out.push({ text: "…", tone: "plain" });
  return out;
}

function segRender(segs: { text: string; tone?: string }[]): string {
  return segs
    .map((s) => {
      const t = s.text;
      if (s.tone === "dim") return dim(t);
      if (s.tone === "bold") return white(t);
      return t;
    })
    .join("");
}

/**
 * Rounded box: ╭─ Title ───╮ / │ rows │ / ╰───╯.
 * Inner padding is 2 columns each side; width = longest row + 4, capped at
 * columns - 2 (rows are ellipsized to fit, never wrapped).
 */
export function roundedBox(title: string, rows: BoxLine[]): string[] {
  const cfg = getUi();
  const maxW = Math.max(10, cfg.columns - 2);
  const inner = Math.max(
    displayWidth(title) + 4,
    ...rows.map((r) => segWidth(r.segs)),
  );
  const contentW = Math.min(inner, maxW - 4);
  const boxW = contentW + 4;

  const tl = sym("boxTL");
  const tr = sym("boxTR");
  const bl = sym("boxBL");
  const br = sym("boxBR");
  const h = sym("hline");
  const v = sym("railV");

  const titleSeg = ` ${title} `;
  const topFill = Math.max(0, boxW - displayWidth(titleSeg) - 1);
  const lines: string[] = [];
  lines.push(mint(tl + h + titleSeg + h.repeat(topFill) + tr));
  lines.push(mint(v) + " ".repeat(boxW) + mint(v));
  for (const row of rows) {
    const segs = truncateSegs(row.segs, contentW);
    const w = segWidth(segs);
    const pad = " ".repeat(Math.max(0, contentW - w));
    lines.push(mint(v) + "  " + segRender(segs) + pad + "  " + mint(v));
  }
  lines.push(mint(v) + " ".repeat(boxW) + mint(v));
  lines.push(mint(bl + h.repeat(boxW) + br));
  return lines;
}

// ---------- spinner ----------

const BRAILLE = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_MS = 80;

let cursorHidden = false;
let exitHooksInstalled = false;

function hideCursor(): void {
  if (!getUi().interactive) return;
  process.stdout.write("\x1b[?25l");
  cursorHidden = true;
}
function showCursor(): void {
  if (!cursorHidden) return;
  process.stdout.write("\x1b[?25h");
  cursorHidden = false;
}

function installExitHooks(): void {
  if (exitHooksInstalled) return;
  exitHooksInstalled = true;
  const restore = () => showCursor();
  process.on("exit", restore);
  process.on("SIGINT", () => {
    restore();
    // Let the default SIGINT behavior continue after restoring.
    process.exit(130);
  });
  process.on("uncaughtException", (err) => {
    restore();
    throw err;
  });
}

export interface Spinner {
  /** Stop animation; prints finalLine (or nothing) and restores cursor. */
  stop(finalLine?: string): void;
  /** Update the trailing text (e.g. elapsed seconds) without a newline. */
  setNote(note: string): void;
}

/**
 * Animated braille spinner for interactive TTYs. On non-TTY it is a no-op
 * until stop(), which prints the finished line exactly once.
 * render(frame, elapsedSeconds, note) must return the full line to draw.
 */
export function startSpinner(
  render: (frame: string, elapsedSec: number, note: string) => string,
): Spinner {
  const cfg = getUi();
  installExitHooks();
  if (!cfg.interactive) {
    return {
      stop(finalLine?: string) {
        if (finalLine !== undefined) process.stdout.write(finalLine + "\n");
      },
      setNote() {},
    };
  }
  hideCursor();
  const t0 = Date.now();
  let frame = 0;
  let note = "";
  let stopped = false;
  const draw = () => {
    if (stopped) return;
    const elapsed = (Date.now() - t0) / 1000;
    const ch = BRAILLE[frame % BRAILLE.length]!;
    process.stdout.write("\r" + render(mint(ch), elapsed, note) + "\x1b[K");
    frame++;
  };
  draw();
  const timer = setInterval(draw, SPINNER_MS);
  timer.unref?.();
  return {
    stop(finalLine?: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      showCursor();
      process.stdout.write("\r\x1b[K");
      if (finalLine !== undefined) process.stdout.write(finalLine + "\n");
    },
    setNote(n: string) {
      note = n;
    },
  };
}

// ---------- request log line ----------

const ASSET_RE =
  /\.(?:js|mjs|css|map|json|xml|txt|webmanifest|br|gz|png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|otf|mp4|webm|wasm|bic)(?:\?.*)?$/i;

export interface RequestLogEntry {
  method: string;
  path: string;
  status: number;
  ms: number;
}

export function isAssetPath(path: string): boolean {
  return ASSET_RE.test(path);
}

function statusColor(status: number, text: string): string {
  if (status >= 500) return red(text);
  if (status >= 400) return amber(text);
  if (status >= 200 && status < 400) return mint(text);
  return dim(text);
}

/**
 * One request line: `◇  GET  /  200  12 ms`.
 * Returns null for asset requests (caller prints nothing).
 */
export function formatRequestLine(entry: RequestLogEntry): string | null {
  if (isAssetPath(entry.path)) return null;
  const cfg = getUi();
  let path = entry.path;
  if (cfg.narrow) path = ellipsize(path, Math.max(10, cfg.columns - 30), true);
  const method = dim(entry.method.padEnd(4));
  const p = white(path);
  const status = statusColor(entry.status, String(entry.status));
  const dur = dim(`${entry.ms} ms`);
  return `${mint(sym("diamond"))}  ${method}  ${p}  ${status}  ${dur}`;
}

/** JSON request line matching the core logger's shape (non-TTY/prod). */
export function requestLineJson(entry: RequestLogEntry): void {
  console.log(
    JSON.stringify({
      level: "info",
      time: new Date().toISOString(),
      msg: `${entry.method} ${entry.path} ${entry.status} ${entry.ms}ms`,
      method: entry.method,
      path: entry.path,
      status: entry.status,
      ms: entry.ms,
    }),
  );
}

/**
 * Print one request line. `json` selects the structured log format used
 * for production aggregation (non-interactive or json logging).
 */
export function printRequestLine(entry: RequestLogEntry, opts: { json?: boolean } = {}): void {
  if (opts.json) {
    requestLineJson(entry);
    return;
  }
  const line = formatRequestLine(entry);
  if (line) console.log(line);
}

// ---------- error / warning blocks ----------

export interface ErrorFrameLine {
  line: number;
  text: string;
  markerColumn?: number;
}

export interface ErrorReportLike {
  name?: string;
  message?: string;
  code?: string;
  location?: string;
  file?: string;
  line?: number;
  column?: number;
  route?: string;
  runtime?: string;
  stack?: string;
  severity?: string;
  frame?: ErrorFrameLine[];
}

export interface ErrorBlockOptions {
  /** Project root for relativizing `at` paths (with folder prefix). */
  rootDir?: string;
  /** Show stack trace (dim) after the block. */
  verbose?: boolean;
}

function relProjectPath(loc: string, rootDir?: string): string {
  const cfg = getUi();
  let p = loc.replace(/\\/g, "/");
  if (rootDir) {
    const root = rootDir.replace(/\\/g, "/").replace(/\/+$/, "");
    const folder = root.split("/").filter(Boolean).pop() ?? "";
    if (p.startsWith(root + "/")) {
      p = `${folder}/${p.slice(root.length + 1)}`;
    } else if (p.startsWith("/")) {
      // already absolute outside root — keep, but shorten when narrow
      if (cfg.narrow) p = ellipsize(p, Math.max(20, cfg.columns - 30), true);
    }
  }
  return p;
}

function atValue(report: ErrorReportLike, rootDir?: string): { text: string; dimSuffix: string } | null {
  const cfg = getUi();
  if (report.location) {
    const loc = report.location.replace(/\\/g, "/");
    const m = loc.match(/^(.*?):(\d+):(\d+)$/);
    if (m) {
      const file = relProjectPath(m[1]!, rootDir);
      let text = file;
      if (cfg.narrow) text = ellipsize(text, Math.max(16, cfg.columns - 34), true);
      return { text, dimSuffix: `:${m[2]}:${m[3]}` };
    }
    return { text: relProjectPath(loc, rootDir), dimSuffix: "" };
  }
  if (report.file) {
    const file = relProjectPath(report.file, rootDir);
    const suffix = report.line ? `:${report.line}${report.column ? `:${report.column}` : ""}` : "";
    return { text: file, dimSuffix: suffix };
  }
  return null;
}

/**
 * FRAME 3: structured error/warning block with colored rail.
 * Returns the block text (with surrounding blank lines) — caller prints it.
 */
export function formatErrorBlock(report: ErrorReportLike, opts: ErrorBlockOptions = {}): string {
  const cfg = getUi();
  const isWarn = report.severity === "warning";
  const rail = sym("errRail");
  const caretSym = sym("caret");
  const labelW = 9;

  const lines: string[] = [];
  const railPaint = isWarn ? amber : red;

  if (isWarn) {
    // Warning block: badge and message share the first line (amber).
    const msg = report.message || "";
    lines.push(`${railPaint(rail)}  ${warnBadge("WARN")}  ${amber(msg)}`);
  } else {
    const badge = errorBadge("ERROR");
    const name = report.name || "Error";
    const msg = report.message || "";
    lines.push(`${railPaint(rail)}  ${badge}  ${red(name)}`);
    lines.push(`${railPaint(rail)}  ${white(msg)}`);
  }

  const rows: [string, string][] = [];
  if (report.code) rows.push(["code", white(report.code)]);
  const at = atValue(report, opts.rootDir);
  if (at) rows.push(["at", at.text + dim(at.dimSuffix)]);
  if (report.route) rows.push(["route", white(report.route)]);
  if (report.runtime) rows.push(["runtime", white(report.runtime)]);

  if (rows.length) {
    lines.push(`${railPaint(rail)}`);
    for (const [label, value] of rows) {
      lines.push(`${railPaint(rail)}  ${dim(padEnd(label, labelW))}${value}`);
    }
  }

  if (report.frame && report.frame.length > 0) {
    lines.push(`${railPaint(rail)}`);
    const nums = report.frame.map((f) => String(f.line));
    const gutter = Math.max(...nums.map((n) => n.length));
    const maxText = cfg.narrow ? Math.max(10, cfg.columns - 24) : Infinity;
    for (const f of report.frame) {
      const marked = f.markerColumn !== undefined;
      let text = f.text;
      if (displayWidth(text) > maxText) text = ellipsize(text, maxText);
      const num = padStart(String(f.line), gutter);
      const marker = marked ? `${red(caretSym)} ` : "  ";
      const lineText = marked ? white(text) : dim(text);
      lines.push(
        `${railPaint(rail)}  ${marker}${num} ${sym("railV")}  ${lineText}`,
      );
      if (marked) {
        const caretPad = " ".repeat(Math.max(0, (f.markerColumn ?? 1) - 1));
        lines.push(
          `${railPaint(rail)}  ${" ".repeat(gutter + 3)}${sym("railV")}  ${red(caretPad + "^")}`,
        );
      }
    }
  }

  const out = ["", ...lines, ""].join("\n");
  if ((opts.verbose || envFlag("FROST_DEBUG")) && report.stack) {
    const stackLines = report.stack
      .split("\n")
      .slice(1) // skip the "Name: message" first line — already shown
      .map((l) => dim(l));
    return out + "\n" + stackLines.join("\n") + "\n";
  }
  return out + "\n";
}

export function printErrorBlock(report: ErrorReportLike, opts: ErrorBlockOptions = {}): void {
  process.stderr.write(formatErrorBlock(report, opts));
}

/** Single-line amber warning (non-block, for transient notices). */
export function warnLine(message: string): string {
  const prefix = getUi().emoji ? "⚠  " : "";
  return amber(prefix + message);
}
