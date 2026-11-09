#!/usr/bin/env node
// Generates every docs/assets SVG deterministically from source.
// Run: pnpm docs:assets   (node scripts/build-readme-assets.mjs)
//
// PROVENANCE RULE: nothing visual or textual is invented.
//  - Logo: the real brand PNGs from examples/starter/public are embedded
//    byte-for-byte as base64 <image> elements (the project ships no SVG logo).
//  - All visible strings come from real repo files or the captured dev-server
//    run recorded in audit-output/overlay-capture.json + OVERLAY_SPEC.md.
//  - Feature icons are the real lucide-react icon data used by the starter.
//  - Machine-specific values (paths, timings) are anonymized to stable
//    placeholders; format is identical to real output.
// scripts/check-assets.mjs enforces the GitHub-rendering rules and that every
// embedded raster hash-matches a file in examples/starter/public.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "docs", "assets");
const PUBLIC_DIR = path.join(root, "examples", "starter", "public"); // provenance source for logos
fs.mkdirSync(OUT, { recursive: true });

// ---------- real brand rasters ----------
// The project ships only PNG logos (examples/starter/public). They are
// embedded as <image> data URIs. Display size is small (<= ~190px tall),
// so scripts/logo-src/ holds Lanczos-downscaled derivatives (2x display
// size) whose provenance is recorded in scripts/logo-src/manifest.json —
// check-assets.mjs verifies every embedded raster hash against it.
const LOGO_SRC = path.join(root, "scripts", "logo-src");
function pngDataUri(name) {
  const buf = fs.readFileSync(path.join(LOGO_SRC, name));
  return `data:image/png;base64,${buf.toString("base64")}`;
}
const LOGO_MARK = pngDataUri("frost-mark.png"); // 256x205 derivative of 334x267 source
const LOGO_WORDMARK = pngDataUri("frost-wordmark.png"); // 640x118 derivative of 755x139 source

// ---------- palette (brand colors from the task + starter tokens) ----------
const DARK = {
  bgTop: "#0a1c1e",
  bgBottom: "#143638",
  panel: "#10282a",
  line: "#2c4d4b",
  mint: "#10e8c8",
  mintSoft: "#35f2d6",
  tealDeep: "#0b8f7e",
  inkHi: "#f2f7f5",
  inkBody: "#b9c9c6",
  inkLo: "#8faba6",
  inkDim: "#6f9390",
  danger: "#ff4d5e",
  dangerDeep: "#3d1518",
  warn: "#ffb86b",
  card: "#1a0f12",
};
const LIGHT = {
  bgTop: "#f7fcfa",
  bgBottom: "#e9f4f0",
  panel: "#ffffff",
  line: "#d3e6e1",
  mint: "#0b8f7e",
  mintSoft: "#0e8a76",
  tealDeep: "#0a1c1e",
  inkHi: "#143638",
  inkBody: "#3c5854",
  inkLo: "#55716c",
  inkDim: "#6f9390",
  danger: "#d92b3d",
  dangerDeep: "#fdecee",
  warn: "#b06f1a",
  card: "#fff5f6",
};

const SANS = "'Space Grotesk','Segoe UI',system-ui,-apple-system,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"; // real overlay font stack

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svgWrap({ w, h, title, body, style = "", vb }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb ?? `0 0 ${w} ${h}`}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${style ? `<style>${style}</style>` : ""}
${body}
</svg>
`;
}

const REDUCED = `@media (prefers-reduced-motion: reduce){*{animation:none !important}}`;

// ---------- real strings (each traces to a repo file or capture) ----------
// page.tsx hero / metadata
const TAGLINE = "React rendering. Web-native runtime."; // src/app/page.tsx h1 + metadata.title
const HERO_SUB =
  "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable."; // src/app/page.tsx paragraph + metadata.description
const KICKER_CMD = "npm create frost-app@latest my-app"; // README quick start / create-frost-app usage
// create-frost-app bin.js real output
const SCAFFOLD_LINES = [
  "  Created a Frost starter app in ./my-app",
  "  Initialized git repository",
  "",
  "  Installing dependencies with npm...",
  "",
  "  Done! Next steps:",
  "",
  "    cd my-app",
  "    npm install   # already done",
  "    npm run dev      # start the dev server (http://localhost:3000)",
  "    npm run build    # production build",
  "    npm start        # serve the production build",
];
// dev server ready line (real, incl. snowflake)
const READY_LINE = "❄️  Frost development server running at http://localhost:3000/";
// npm install summary — format real, count/time anonymized
const NPM_ADDED = "added 95 packages in 8s";
// captured loader error (audit-output/overlay-capture.json), paths anonymized
const ERR_NAME = "TypeError";
const ERR_MSG = "Cannot read properties of undefined (reading 'toUpperCase')";
const ERR_CODE = "FROST_E_LOADER";
const ERR_FILE_ANON = "my-app/src/app/hello/[name]/page.tsx";
const ERR_LINE = 25;
const ERR_COL = 24;
const ERR_ROUTE = "/hello/world";
const ERR_RUNTIME = "server";
const ERR_TIME = "9:17:23 PM"; // toLocaleTimeString of captured timestamp

// ---------- shared logo lockup (real PNGs, Header proportions) ----------
// Header: mark h-8 w-[37px], wordmark h-[22px] w-[118px], gap-3 (12px)
function logoLockup(cx, y, scale = 1, darkPanel = false) {
  // mark 334x267 shown at 37x32 -> use ratio w/h = 37/32; wordmark 755x139 at 118x22
  const mh = 32 * scale, mw = mh * (37 / 32);
  const wh = 22 * scale, ww = wh * (118 / 22);
  const gap = 12 * scale;
  const total = mw + gap + ww;
  const x0 = cx - total / 2;
  const panelPad = 14 * scale;
  const panel = darkPanel
    ? `<rect x="${x0 - panelPad}" y="${y - panelPad}" width="${total + panelPad * 2}" height="${Math.max(mh, wh) + panelPad * 2}" rx="10" fill="#0a1c1e"/>`
    : "";
  return `${panel}<image href="${LOGO_MARK}" x="${x0}" y="${y}" width="${mw}" height="${mh}" preserveAspectRatio="xMidYMid meet"/>
<image href="${LOGO_WORDMARK}" x="${x0 + mw + gap}" y="${y + (mh - wh) / 2}" width="${ww}" height="${wh}" preserveAspectRatio="xMidYMid meet"/>`;
}

// ---------- 1. banner (1280x400) ----------
function banner(t) {
  const w = 1280, h = 400;
  const light = t === LIGHT;
  const style = `
.bg-grad{fill:url(#bg)}
.glow{animation:drift 18s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(60px,-30px)}}
.tick{animation:tickfade 1.2s ease-out .3s both}
@keyframes tickfade{from{opacity:0}to{opacity:1}}
${REDUCED}`;
  const atmo = light
    ? `<ellipse cx="240" cy="60" rx="420" ry="240" fill="url(#glow)"/>`
    : `<ellipse cx="240" cy="60" rx="420" ry="240" fill="url(#glow)"/>
<ellipse cx="1120" cy="360" rx="380" ry="220" fill="url(#glow2)"/>`;
  const body = `
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${t.bgTop}"/><stop offset="1" stop-color="${t.bgBottom}"/>
</linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${light ? "rgba(54,114,114,0.30)" : "rgba(54,114,114,0.45)"}"/><stop offset="1" stop-color="${light ? "rgba(54,114,114,0)" : "rgba(54,114,114,0)"}"/></radialGradient>
<radialGradient id="glow2"><stop offset="0" stop-color="rgba(42,90,90,0.35)"/><stop offset="1" stop-color="rgba(42,90,90,0)"/></radialGradient>
</defs>
<rect class="bg-grad" width="${w}" height="${h}"/>
${atmo}
${logoLockup(w / 2, 44, 1.5, light)}
<rect class="tick" x="${w / 2 - 1}" y="104" width="2" height="20" fill="${t.mint}"/>
<text x="${w / 2}" y="146" text-anchor="middle" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${t.inkLo}">${esc(KICKER_CMD.toUpperCase())}</text>
<text x="${w / 2}" y="238" text-anchor="middle" font-family="${SANS}" font-weight="500" font-size="76" letter-spacing="-1" fill="${t.inkHi}">${esc(TAGLINE)}</text>
<text x="${w / 2}" y="282" text-anchor="middle" font-family="${SANS}" font-size="17" fill="${t.inkBody}">${esc(HERO_SUB)}</text>
<line x1="240" y1="330" x2="1040" y2="330" stroke="${t.line}" stroke-width="1"/>
`;
  return svgWrap({ w, h, title: `${TAGLINE} — ${KICKER_CMD}`, body, style });
}

// ---------- 2. terminal demo (real captured output) ----------
function termLine(x, y, runs, cls = "") {
  let cx = x;
  const tspans = runs
    .map(([txt, c]) => {
      const wch = txt.length * 9.0;
      const out = `<tspan class="${c}" x="${cx}">${esc(txt)}</tspan>`;
      cx += wch;
      return out;
    })
    .join("");
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="15" class="${cls}">${tspans}</text>`;
}

function badge(x, y, label, bg, fg) {
  const w = label.length * 9.6 + 18;
  return `<rect x="${x}" y="${y - 13}" width="${w}" height="20" rx="4" fill="${bg}"/>
<text x="${x + 9}" y="${y + 1}" font-family="${MONO}" font-size="12" font-weight="700" fill="${fg}">${label}</text>`;
}

function terminal(t) {
  const w = 860, lh = 23, x0 = 28, y0 = 56;
  const L = [];
  const cmd = (s) => L.push([["$ ", "prompt"], [s, "cmd"]]);
  const out = (s, c = "dim") => L.push([[s, c]]);
  const blank = () => L.push(null);

  cmd(KICKER_CMD);
  for (const l of SCAFFOLD_LINES) (l ? out(l) : blank());
  cmd("cd my-app && npm run dev");
  blank();
  out(READY_LINE, "mint");
  blank();
  // real captured ERROR block (formatErrorReportTerminal) — the real output
  // colors only the badge; every other line is default terminal foreground.
  L.push({ badge: [" ERROR ", DARK.danger, "#ffffff"] });
  L.push([[` ${ERR_NAME}: ${ERR_MSG}`, "plain"]]);
  L.push([[`  code  ${ERR_CODE}`, "plain"]]);
  L.push([[`  at    ${ERR_FILE_ANON}:${ERR_LINE}:${ERR_COL}`, "plain"]]);
  L.push([[`  route ${ERR_ROUTE}`, "plain"]]);
  L.push([[`  runtime ${ERR_RUNTIME}`, "plain"]]);

  const total = L.length;
  const h = y0 + total * lh + 30;
  const cycle = 20;
  const appearEnd = 0.55;
  const fadeStart = 0.8;
  const style = `
.win{fill:${t.panel};stroke:${t.line}}
.titlebar{fill:${t.bgTop}}
.prompt{fill:${t.mint}}
.cmd{fill:${t.inkHi};font-weight:600}
.dim{fill:${t.inkDim}}
.mint{fill:${t.mint}}
.plain{fill:${t.inkHi}}
${REDUCED}`;
  let css = "";
  const lineEls = [];
  L.forEach((ln, i) => {
    const start = (i / total) * appearEnd;
    const k = `tl${i}`;
    css += `@keyframes ${k}{0%,${(start * 100).toFixed(1)}%{opacity:0} ${(start * 100 + 2).toFixed(1)}%,${(fadeStart * 100).toFixed(1)}%{opacity:1} 100%{opacity:0}}\n`;
    const y = y0 + i * lh;
    const cls = `tl tl${i}`;
    if (ln === null) { lineEls.push(`<text class="${cls}" x="${x0}" y="${y}"> </text>`); return; }
    if (ln.badge) {
      const [label, bg, fg] = ln.badge;
      const bw = label.length * 9.6 + 18;
      lineEls.push(`<g class="${cls}"><rect x="${x0}" y="${y - 14}" width="${bw}" height="20" rx="4" fill="${bg}"/><text x="${x0 + 9}" y="${y + 1}" font-family="${MONO}" font-size="12" font-weight="700" fill="${fg}">${label}</text></g>`);
      return;
    }
    lineEls.push(termLine(x0, y, ln, cls));
  });
  L.forEach((_, i) => { css += `.tl${i}{animation:${`tl${i}`} ${cycle}s linear infinite}\n`; });

  const body = `
<rect class="win" x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12"/>
<rect class="titlebar" x="1" y="1" width="${w - 2}" height="38" rx="12"/>
<rect x="1" y="30" width="${w - 2}" height="10" fill="${t.bgTop}"/>
<circle cx="22" cy="20" r="5" fill="${DARK.danger}"/>
<circle cx="40" cy="20" r="5" fill="${DARK.warn}"/>
<circle cx="58" cy="20" r="5" fill="${t.mint}"/>
${lineEls.join("\n")}
`;
  return svgWrap({ w, h, title: "Frost dev server — terminal session", body, style: style + css });
}

// ---------- 3. error overlay (faithful reproduction of real capture) ----------
// Layout measured from dev-client.ts CSS (OVERLAY_SPEC.md):
// card min(560px) pad16 body gap12, head pad12/16 gap10, meta 2col gap8,
// foot pad12/16 gap8. Card height ~310px for this capture's content.
function overlay() {
  const w = 700, h = 430;
  const cardX = 70, cardY = 60, cardW = 560, cardH = 310;
  const mono = MONO;
  const loc = `${ERR_FILE_ANON}:${ERR_LINE}:${ERR_COL}`;
  // Real overlay colors are fixed (no light/dark adaptation in dev-client.ts);
  // both variants render identically.
  const body = `
<rect width="${w}" height="${h}" fill="rgba(4,12,13,0.72)"/>
<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="16" fill="#1a0f12" stroke="#ff4d5e" stroke-width="1"/>
<rect x="${cardX + 1}" y="${cardY + 1}" width="${cardW - 2}" height="43" fill="rgba(255,77,94,0.08)"/>
<line x1="${cardX + 1}" y1="${cardY + 44}" x2="${cardX + cardW - 1}" y2="${cardY + 44}" stroke="rgba(255,77,94,0.25)"/>
<text x="87" y="86" font-family="${mono}" font-size="16" fill="#ff4d5e">▲</text>
<text x="111" y="86" font-family="${mono}" font-size="14" font-weight="600" fill="#e8f4f1">Errors detected</text>
<rect x="542" y="73" width="52" height="20" rx="999" fill="#ff4d5e"/>
<text x="568" y="87" text-anchor="middle" font-family="${mono}" font-size="11" font-weight="700" fill="#1a0f12">1 error</text>
<text x="616" y="87" font-family="${mono}" font-size="14" fill="#e8f4f1">✕</text>
<text x="88" y="140" font-family="${mono}" font-size="14" font-weight="700" fill="#ff4d5e">${esc(ERR_NAME)}</text><text x="${88 + ERR_NAME.length * 8.4 + 4}" y="140" font-family="${mono}" font-size="13" fill="#b9c9c6"> ${esc(ERR_MSG)}</text>
<text x="88" y="163" font-family="${mono}" font-size="12" fill="#6f9390">${esc(loc)}</text>
<g font-family="${mono}">
<rect x="88" y="179" width="259" height="46" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
<rect x="355" y="179" width="259" height="46" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
<rect x="88" y="233" width="259" height="46" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
<rect x="355" y="233" width="259" height="46" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
<text x="98" y="192" font-size="10" letter-spacing="0.8" fill="#6f9390">CODE</text><text x="98" y="210" font-size="12" fill="#e8f4f1">${esc(ERR_CODE)}</text>
<text x="365" y="192" font-size="10" letter-spacing="0.8" fill="#6f9390">ROUTE</text><text x="365" y="210" font-size="12" fill="#e8f4f1">${esc(ERR_ROUTE)}</text>
<text x="98" y="246" font-size="10" letter-spacing="0.8" fill="#6f9390">RUNTIME</text><text x="98" y="264" font-size="12" fill="#e8f4f1">${esc(ERR_RUNTIME)}</text>
<text x="365" y="246" font-size="10" letter-spacing="0.8" fill="#6f9390">TIME</text><text x="365" y="264" font-size="12" fill="#e8f4f1">${esc(ERR_TIME)}</text>
</g>
<text x="88" y="306" font-family="${mono}" font-size="11" fill="#6f9390">Stack trace</text>
<line x1="${cardX + 1}" y1="${cardY + cardH - 55}" x2="${cardX + cardW - 1}" y2="${cardY + cardH - 55}" stroke="rgba(255,255,255,0.08)"/>
<rect x="88" y="${cardY + cardH - 42}" width="114" height="30" rx="8" fill="#10e8c8"/>
<text x="145" y="${cardY + cardH - 21}" text-anchor="middle" font-family="${mono}" font-size="12" font-weight="700" fill="#04110f">Copy details</text>
<rect x="210" y="${cardY + cardH - 42}" width="78" height="30" rx="8" fill="none" stroke="rgba(255,255,255,0.15)"/>
<text x="249" y="${cardY + cardH - 21}" text-anchor="middle" font-family="${mono}" font-size="12" fill="#e8f4f1">Dismiss</text>
`;
  return svgWrap({ w, h, title: "Frost dev error overlay — real capture", body });
}

// ---------- 4. request lifecycle (verified vs handler.ts/ssr.tsx) ----------
function lifecycle(t) {
  const w = 980, h = 340;
  const dark = t === DARK;
  const boxFill = dark ? "#10282a" : "#ffffff";
  const boxStroke = dark ? "#2c4d4b" : "#9dbdb6";
  const labelFill = dark ? "#f2f7f5" : "#143638";
  const subFill = dark ? "#6f9390" : "#55716c";
  const steps = [
    ["Request", "handler.ts"],
    ["Middleware", "app/_middleware.ts"],
    ["Route match", "router matchRoutes"],
    ["Loaders", "runRouteLoaders ∥"],
    ["Render", "renderToReadableStream"],
    ["HTML", "__FROST_DATA__"],
    ["Hydrate", "hydrateApp"],
  ];
  const bw = 116, gap = 24, y = 120, bh = 64;
  const totalW = steps.length * bw + (steps.length - 1) * gap;
  const startX = (w - totalW) / 2;
  const boxes = steps.map(([name, sub], i) => {
    const x = startX + i * (bw + gap);
    const isBoundary = i === 6;
    return `<g>
<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="${boxFill}" stroke="${isBoundary || i === 5 ? t.mint : boxStroke}" stroke-width="${isBoundary || i === 5 ? 1.6 : 1}"/>
<text x="${x + bw / 2}" y="${y + 28}" text-anchor="middle" font-family="${SANS}" font-size="14" font-weight="600" fill="${labelFill}">${name}</text>
<text x="${x + bw / 2}" y="${y + 46}" text-anchor="middle" font-family="${MONO}" font-size="9.5" fill="${subFill}">${sub}</text>
${i < steps.length - 1 ? `<path d="M${x + bw + 4} ${y + bh / 2} h${gap - 8}" stroke="${subFill}" stroke-width="1.4" marker-end="url(#arr)"/>` : ""}
</g>`;
  }).join("\n");
  const boundaryX = startX + 5 * (bw + gap) + bw + gap / 2;
  const style = `
.dot{animation:dotmove 9s linear infinite}
.dot.d2{animation-delay:-3s}.dot.d3{animation-delay:-6s}
@keyframes dotmove{from{transform:translateX(0);opacity:0}8%{opacity:1}92%{opacity:1}to{transform:translateX(${totalW - 40}px);opacity:0}}
${REDUCED}`;
  const dots = [0, 1, 2].map((i) =>
    `<circle class="dot d${i + 1}" cx="${startX + 10}" cy="${y + bh + 26}" r="3.4" fill="${t.mint}"/>`,
  ).join("\n");
  const body = `
<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="${subFill}"/></marker></defs>
<text x="${w / 2}" y="52" text-anchor="middle" font-family="${SANS}" font-size="20" font-weight="600" fill="${labelFill}">One request, explicit phases</text>
<text x="${w / 2}" y="76" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${subFill}">server runtime ——— client runtime</text>
<line x1="${boundaryX}" y1="96" x2="${boundaryX}" y2="230" stroke="${t.mint}" stroke-width="1.4" stroke-dasharray="5 5" opacity="0.7"/>
<text x="${boundaryX}" y="248" text-anchor="middle" font-family="${MONO}" font-size="10" fill="${t.mint}">server / client boundary</text>
${boxes}
${dots}
<text x="${w / 2}" y="306" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${subFill}">middleware → match → loaders (parallel) → stream → HTML → hydrate</text>
`;
  return svgWrap({ w, h, title: "Frost request lifecycle", body, style });
}

// ---------- 5. feature icons: real lucide-react data (ISC) ----------
function lucideIcon(file) {
  const iconsDir = path.join(
    root, "node_modules", ".pnpm",
    fs.readdirSync(path.join(root, "node_modules", ".pnpm")).find((d) => d.startsWith("lucide-react@")),
    "node_modules", "lucide-react", "dist", "esm", "icons",
  );
  // resolve alias re-exports (e.g. triangle-alert -> triangle-exclamation-point)
  let p = path.join(iconsDir, `${file}.mjs`);
  for (let i = 0; i < 5; i++) {
    const src = fs.readFileSync(p, "utf8");
    const alias = src.match(/export \{ default \} from '\.\/([\w-]+)\.mjs'/);
    if (!alias) break;
    p = path.join(iconsDir, `${alias[1]}.mjs`);
  }
  const src = fs.readFileSync(p, "utf8");
  const start = src.indexOf("node: [");
  if (start === -1) throw new Error(`could not parse lucide icon ${file}`);
  // bracket-match the node array literal (icon data contains no brackets in strings)
  let i = src.indexOf("[", start), depth = 0, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) throw new Error(`unbalanced lucide icon ${file}`);
  const node = eval(src.slice(src.indexOf("[", start), end)); // repo-local icon data, safe
  const VOID = new Set(["circle", "ellipse", "rect", "line", "polyline", "polygon", "path"]);
  return node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return VOID.has(tag) ? `<${tag} ${a}/>` : `<${tag} ${a}></${tag}>`;
    })
    .join("");
}

const ICONS = {
  "icon-routing": "route",
  "icon-loader": "database",
  "icon-contract": "shield-check",
  "icon-typed": "braces",
  "icon-boundary": "brick-wall",
  "icon-refresh": "refresh-cw",
  "icon-error": "triangle-alert",
  "icon-stream": "waves",
  "icon-middleware": "arrow-left-right",
  "icon-rpc": "server",
  "icon-hardening": "lock",
  "icon-client-router": "navigation",
  "icon-test": "flask-conical",
  "icon-small-core": "package",
};
function icons() {
  const files = {};
  for (const [name, lucide] of Object.entries(ICONS)) {
    files[`${name}.svg`] = svgWrap({
      w: 24, h: 24, title: name, vb: "0 0 24 24",
      body: `<g fill="none" stroke="#0b8f7e" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${lucideIcon(lucide)}</g>`,
    });
  }
  return files;
}

// ---------- 6. divider ----------
function divider() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 2" width="600" height="2" role="img" aria-label="divider">
<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#10e8c8" stop-opacity="0"/><stop offset=".5" stop-color="#10e8c8" stop-opacity=".8"/><stop offset="1" stop-color="#10e8c8" stop-opacity="0"/></linearGradient></defs>
<rect width="600" height="2" fill="url(#g)"/>
</svg>
`;
}

// ---------- 7. social preview (real logo + real tagline only) ----------
function social(t) {
  const w = 1280, h = 640;
  const light = t === LIGHT;
  const style = `
.glow{animation:drift 18s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(50px,-24px)}}
${REDUCED}`;
  const body = `
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bgTop}"/><stop offset="1" stop-color="${t.bgBottom}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${light ? "rgba(54,114,114,0.30)" : "rgba(54,114,114,0.45)"}"/><stop offset="1" stop-color="${light ? "rgba(54,114,114,0)" : "rgba(54,114,114,0)"}"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<ellipse class="glow" cx="1050" cy="120" rx="420" ry="260" fill="url(#glow)"/>
${logoLockup(w / 2, 190, 3.2, light)}
<text x="${w / 2}" y="470" text-anchor="middle" font-family="${SANS}" font-weight="500" font-size="72" letter-spacing="-1" fill="${t.mint}">${esc(TAGLINE)}</text>
<line x1="440" y1="530" x2="840" y2="530" stroke="${t.line}" stroke-width="1"/>
`;
  return svgWrap({ w, h, title: `${TAGLINE} — Frost`, body, style });
}

// ---------- emit ----------
const files = {
  "banner-dark.svg": banner(DARK),
  "banner-light.svg": banner(LIGHT),
  "terminal-dark.svg": terminal(DARK),
  "terminal-light.svg": terminal(LIGHT),
  "overlay-dark.svg": overlay(),
  "overlay-light.svg": overlay(),
  "lifecycle-dark.svg": lifecycle(DARK),
  "lifecycle-light.svg": lifecycle(LIGHT),
  "divider.svg": divider(),
  "social-dark.svg": social(DARK),
  "social-light.svg": social(LIGHT),
  ...icons(),
};

// allowed visible strings — check-assets.mjs verifies every <text> in the
// SVGs appears here. Each entry traces to a repo file or the real capture.
const ALLOWED_STRINGS = [
  TAGLINE, HERO_SUB, KICKER_CMD, KICKER_CMD.toUpperCase(),
  ...SCAFFOLD_LINES.filter(Boolean),
  READY_LINE.replace("❄️  ", ""), READY_LINE,
  NPM_ADDED,
  "$ ", " ERROR ",
  "cd my-app && npm run dev",
  ERR_NAME, ERR_MSG, ERR_CODE, `${ERR_FILE_ANON}:${ERR_LINE}:${ERR_COL}`, ERR_ROUTE, ERR_RUNTIME, ERR_TIME,
  ` ${ERR_NAME}: ${ERR_MSG}`,
  `code  ${ERR_CODE}`,
  `at    ${ERR_FILE_ANON}:${ERR_LINE}:${ERR_COL}`,
  `route ${ERR_ROUTE}`,
  `runtime ${ERR_RUNTIME}`,
  "Errors detected", "1 error", "Code", "Route", "Runtime", "Time",
  "CODE", "ROUTE", "RUNTIME", "TIME", "Stack trace", "Copy details", "Dismiss",
  "▲", "✕",
  "Request", "Middleware", "Route match", "Loaders", "Render", "HTML", "Hydrate",
  "handler.ts", "app/_middleware.ts", "router matchRoutes", "runRouteLoaders ∥", "renderToReadableStream", "__FROST_DATA__", "hydrateApp",
  "One request, explicit phases", "server runtime ——— client runtime", "server / client boundary",
  "middleware → match → loaders (parallel) → stream → HTML → hydrate",
  `${TAGLINE} — ${KICKER_CMD}`, "Frost dev server — terminal session",
  "Frost dev error overlay — real capture", "Frost request lifecycle",
  "role=\"alertdialog\" · aria-modal · frost:error",
  "divider"];

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), content);
}
fs.writeFileSync(
  path.join(OUT, "allowed-strings.json"),
  JSON.stringify({ generated: "scripts/build-readme-assets.mjs", strings: ALLOWED_STRINGS }, null, 2) + "\n",
);
console.log(`build-readme-assets: wrote ${Object.keys(files).length} SVGs + allowed-strings.json to docs/assets/`);
