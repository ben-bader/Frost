#!/usr/bin/env node
// Generates every docs/assets SVG deterministically from source.
// Run: pnpm docs:assets   (node scripts/build-readme-assets.mjs)
//
// Rules enforced by scripts/check-assets.mjs:
//  - no script/foreignObject/external refs/raster images
//  - animation via CSS @keyframes only, transform+opacity only,
//    8-20s loops, wrapped in prefers-reduced-motion
//  - <150KB per file, text uses system stacks (SVG-as-img can't load
//    webfonts reliably — Space Grotesk/Space Mono are listed first so
//    installs that have them get the brand face)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "docs", "assets");
fs.mkdirSync(OUT, { recursive: true });

// ---------- palette ----------
const DARK = {
  bgTop: "#0a1c1e",
  bgBottom: "#143638",
  panel: "#10282a",
  line: "#2c4d4b",
  mint: "#10e8c8",
  mintSoft: "#35f2d6",
  mintDeep: "#0fbfa5",
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
  mint: "#0b8f7e", // darker mint for contrast on light bg
  mintSoft: "#0e8a76",
  mintDeep: "#0a6f61",
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
const MONO = "'Space Mono',ui-monospace,'Cascadia Mono',Consolas,monospace";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svgWrap({ w, h, title, body, style = "", vb }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb ?? `0 0 ${w} ${h}`}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${style ? `<style>${style}</style>` : ""}
${body}
</svg>
`;
}

// ---------- shared bits ----------
function logoMark(x, y, s, c1, c2, c3) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
<path d="M12 0h38l-6 9H17z" fill="${c1}"/>
<path d="M9 14h28l-5 8H5z" fill="${c2}"/>
<path d="M0 44L12 24h6L4 44z" fill="${c3}"/>
</g>`;
}

const REDUCED = `@media (prefers-reduced-motion: reduce){*{animation:none !important}}`;

// ---------- 1. banner ----------
function banner(t) {
  const w = 1280, h = 400;
  const mintGlow = t === "dark" ? "rgba(16,232,200,0.16)" : "rgba(11,143,126,0.14)";
  const style = `
.bg-grad{fill:url(#bg)}
.glow{animation:drift 18s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(60px,-30px)}}
.tick{animation:tickfade 1.2s ease-out .3s both}
@keyframes tickfade{from{opacity:0}to{opacity:1}}
.dot{animation:dotseq 12s ease-in-out infinite}
@keyframes dotseq{0%,100%{opacity:.15}12%{opacity:.9}24%{opacity:.15}}
${REDUCED}`;
  const dots = [0, 1, 2].map((r) =>
    [0, 1, 2].map((c) =>
      `<circle class="dot" style="animation-delay:${(r * 3 + c) * 0.9}s" cx="${1130 + c * 24}" cy="${300 + r * 26}" r="2.4" fill="${t.mint}"/>`,
    ).join("\n"),
  ).join("\n");
  const body = `
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${t.bgTop}"/><stop offset="1" stop-color="${t.bgBottom}"/>
</linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${mintGlow}"/><stop offset="1" stop-color="${mintGlow.replace(/[\d.]+\)$/, "0)")}"/></radialGradient>
</defs>
<rect class="bg-grad" width="${w}" height="${h}"/>
<ellipse class="glow" cx="1050" cy="80" rx="340" ry="200" fill="url(#glow)"/>
<ellipse class="glow" style="animation-delay:-9s" cx="180" cy="340" rx="300" ry="180" fill="url(#glow)"/>
${logoMark(96, 128, 2.6, t.mint, t.mintSoft, t.tealDeep)}
<rect class="tick" x="72" y="50" width="2" height="20" fill="${t.mint}"/>
<text x="86" y="70" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${t.inkLo}">NPM CREATE FROST-APP@LATEST MY-APP</text>
<text x="292" y="238" font-family="${SANS}" font-weight="600" font-size="92" letter-spacing="4" fill="${t.inkHi}">FROST</text>
<text x="296" y="286" font-family="${MONO}" font-size="21" fill="${t.mint}">React rendering. Web-native runtime.</text>
<text x="296" y="322" font-family="${SANS}" font-size="16" fill="${t.inkDim}">Explicit execution, visible boundaries, predictable hydration.</text>
${dots}
<line x1="96" y1="356" x2="1184" y2="356" stroke="${t.line}" stroke-width="1"/>
`;
  return svgWrap({ w, h, title: "Frost — React rendering. Web-native runtime.", body, style });
}

// ---------- 2. terminal demo ----------
// Line model: [text runs]. Colors: cmd (inkHi bold), dim, mint, red badge, orange.
function termLine(x, y, runs, cls = "") {
  // runs: [[text, className]]
  let cx = x;
  const tspans = runs
    .map(([txt, c]) => {
      const w = txt.length * 9.0; // advance for 15px mono (~0.6em)
      const out = `<tspan class="${c}" x="${cx}">${esc(txt)}</tspan>`;
      cx += w;
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
  const w = 860, h = 700, lh = 23, x0 = 28, y0 = 56;
  // Build the script of lines (each = array of runs or special)
  const L = [];
  const cmd = (s) => L.push([["$ ", "prompt"], [s, "cmd"]]);
  const out = (s, c = "dim") => L.push([[s, c]]);
  const blank = () => L.push(null);

  cmd("npm create frost-app@latest my-app");
  out("  Created a Frost starter app in ./my-app", "dim");
  out("  Initialized git repository", "dim");
  out("  Done! Next steps:", "dim");
  out("    cd my-app", "dim");
  cmd("cd my-app && npm install");
  out("added 87 packages in 4s", "dim");
  cmd("npm run dev");
  blank();
  out("  Frost development server running at http://localhost:3000/", "mint");
  out("  GET /playground  loader threw — see below", "dim");
  blank();
  // ERROR block (real formatErrorReportTerminal shape)
  L.push({ badge: [" ERROR ", DARK.danger, "#fff"] });
  L.push([[" Error: Cannot read properties of undefined (reading 'nav')", "errname"]]);
  L.push([["  code  FROST_E_LOADER", "dim"]]);
  L.push([["  at    src/app/playground/page.tsx:42:11", "dim"]]);
  L.push([["  route /playground", "dim"]]);
  L.push([["  runtime server", "dim"]]);
  blank();
  L.push([["  40 | export const loader = async () => {", "gutter"]]);
  L.push([["  41 |   const res = await fetch(apiUrl);", "gutter"]]);
  L.push([["  42 |   return res.json().nav;", "marktext"], ["        ^", "caret"]]);
  L.push([["  43 | };", "gutter"]]);
  blank();
  L.push({ badge: [" WARN ", DARK.warn, "#1a1206"] });
  L.push([[" Warning: Nondeterministic render output on /playground", "warnname"]]);
  L.push([["  code  FROST_E_HYDRATION", "dim"]]);
  L.push([["  route /playground", "dim"]]);

  const total = L.length;
  const cycle = 20; // seconds
  const appearEnd = 0.58; // all lines visible by ~58%
  const fadeStart = 0.82; // fade out; ~3.6s of empty window at the end
  const style = `
.win{fill:${t.panel};stroke:${t.line}}
.titlebar{fill:${t.bgTop}}
.prompt{fill:${t.mint}}
.cmd{fill:${t.inkHi};font-weight:600}
.dim{fill:${t.inkDim}}
.mint{fill:${t.mint}}
.errname{fill:${t.danger};font-weight:700}
.warnname{fill:${t.warn};font-weight:700}
.gutter{fill:${t.inkDim}}
.marktext{fill:${t.inkHi}}
.caret{fill:${t.danger}}${""}
${REDUCED}`;
  // per-line keyframes: appear at staggered times, hold, fade near end
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
  // mark the highlighted code line background
  const markIdx = L.findIndex((l) => Array.isArray(l) && l.some((r) => r[1] === "marktext"));
  const markRect = markIdx >= 0
    ? `<rect class="tl tl${markIdx}" x="${x0 - 8}" y="${y0 + markIdx * lh - 17}" width="620" height="24" fill="${t.dangerDeep}" opacity="0.55"/>`
    : "";
  // badge/line css: each .tl gets its own animation
  L.forEach((_, i) => { css += `.tl${i}{animation:${`tl${i}`} ${cycle}s linear infinite}\n`; });
  const styleFull = style + css;

  const body = `
<rect class="win" x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12"/>
<rect class="titlebar" x="1" y="1" width="${w - 2}" height="38" rx="12"/>
<rect x="1" y="30" width="${w - 2}" height="10" fill="${t.bgTop}"/>
<circle cx="22" cy="20" r="5" fill="${DARK.danger}"/>
<circle cx="40" cy="20" r="5" fill="${DARK.warn}"/>
<circle cx="58" cy="20" r="5" fill="${t.mint}"/>
<text x="${w / 2}" y="24" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.inkDim}">my-app — zsh</text>
${markRect}
${lineEls.join("\n")}
`;
  return svgWrap({ w, h, title: "Frost dev server — terminal session", body, style: styleFull });
}

// ---------- 3. error overlay preview (static) ----------
function overlay(t) {
  const w = 680, h = 430;
  const dark = t === DARK;
  const panelBg = dark ? "#1a0f12" : "#fffafb";
  const txt = dark ? "#e8f4f1" : "#143638";
  const dim = dark ? "#6f9390" : "#55716c";
  const body = `
<rect width="${w}" height="${h}" fill="${dark ? "rgba(4,12,13,0.72)" : "rgba(244,250,248,0.85)"}"/>
<rect x="60" y="40" width="560" height="350" rx="16" fill="${panelBg}" stroke="${DARK.danger}" stroke-width="1.5"/>
<rect x="60" y="40" width="560" height="44" rx="16" fill="rgba(255,77,94,0.08)"/>
<rect x="60" y="70" width="560" height="14" fill="rgba(255,77,94,0.08)"/>
<path d="M84 56l10-18h20l10 18z" fill="none" stroke="${DARK.danger}" stroke-width="2" stroke-linejoin="round"/>
<line x1="94" y1="46" x2="94" y2="52" stroke="${DARK.danger}" stroke-width="2"/>
<circle cx="94" cy="57" r="1.6" fill="${DARK.danger}"/>
<text x="116" y="68" font-family="${MONO}" font-size="14" font-weight="600" fill="${txt}">Loader failed</text>
<rect x="556" y="54" width="52" height="20" rx="10" fill="${DARK.danger}"/>
<text x="582" y="68" text-anchor="middle" font-family="${MONO}" font-size="11" font-weight="700" fill="#1a0f12">ERR</text>
<text x="84" y="112" font-family="${MONO}" font-size="14" font-weight="700" fill="${DARK.danger}">TypeError: Cannot read properties of undefined</text>
<text x="84" y="134" font-family="${MONO}" font-size="12.5" fill="${dark ? "#b9c9c6" : "#3c5854"}">res.json() returned undefined for /api/nav on the server.</text>
<text x="84" y="156" font-family="${MONO}" font-size="11.5" fill="${dim}">src/app/playground/page.tsx:42:11</text>
<rect x="84" y="172" width="512" height="86" rx="8" fill="rgba(255,255,255,0.03)" stroke="${dark ? "rgba(255,255,255,0.08)" : "#d3e6e1"}"/>
<text x="96" y="194" font-family="${MONO}" font-size="11.5" fill="${dim}">40 | export const loader = async () =&gt; {</text>
<text x="96" y="212" font-family="${MONO}" font-size="11.5" fill="${dim}">41 |   const res = await fetch(apiUrl);</text>
<rect x="88" y="216" width="504" height="18" fill="rgba(255,77,94,0.18)"/>
<text x="96" y="230" font-family="${MONO}" font-size="11.5" fill="${txt}">42 |   return res.json().nav;</text>
<text x="96" y="248" font-family="${MONO}" font-size="11.5" fill="${dim}">43 | };</text>
<g font-family="${MONO}" font-size="10.5">
<rect x="84" y="272" width="248" height="34" rx="8" fill="rgba(255,255,255,0.03)" stroke="${dark ? "rgba(255,255,255,0.08)" : "#d3e6e1"}"/>
<text x="94" y="286" fill="${dim}">CODE</text><text x="94" y="300" fill="${txt}">FROST_E_LOADER</text>
<rect x="348" y="272" width="248" height="34" rx="8" fill="rgba(255,255,255,0.03)" stroke="${dark ? "rgba(255,255,255,0.08)" : "#d3e6e1"}"/>
<text x="358" y="286" fill="${dim}">ROUTE</text><text x="358" y="300" fill="${txt}">/playground</text>
<rect x="84" y="314" width="248" height="34" rx="8" fill="rgba(255,255,255,0.03)" stroke="${dark ? "rgba(255,255,255,0.08)" : "#d3e6e1"}"/>
<text x="94" y="328" fill="${dim}">RUNTIME</text><text x="94" y="342" fill="${txt}">server</text>
<rect x="348" y="314" width="248" height="34" rx="8" fill="rgba(255,255,255,0.03)" stroke="${dark ? "rgba(255,255,255,0.08)" : "#d3e6e1"}"/>
<text x="358" y="328" fill="${dim}">LOCATION</text><text x="358" y="342" fill="${txt}">page.tsx:42:11</text>
</g>
<text x="84" y="366" font-family="${MONO}" font-size="11.5" fill="${DARK.warn}">hint  check the loader's fetch target and response shape</text>
<rect x="84" y="382" width="86" height="26" rx="8" fill="${t.mint}"/>
<text x="127" y="399" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="#062b27">Dismiss</text>
<rect x="178" y="382" width="110" height="26" rx="8" fill="none" stroke="${dark ? "rgba(255,255,255,0.15)" : "#55716c"}"/>
<text x="233" y="399" text-anchor="middle" font-family="${MONO}" font-size="11.5" fill="${txt}">Copy details</text>
`;
  return svgWrap({ w, h, title: "Frost dev error overlay", body });
}

// ---------- 4. request lifecycle ----------
function lifecycle(t) {
  const w = 980, h = 340;
  const dark = t === DARK;
  const boxFill = dark ? "#10282a" : "#ffffff";
  const boxStroke = dark ? "#2c4d4b" : "#9dbdb6";
  const labelFill = dark ? "#f2f7f5" : "#143638";
  const subFill = dark ? "#6f9390" : "#55716c";
  const steps = [
    ["Request", "GET /playground"],
    ["Middleware", "app/_middleware.ts"],
    ["Route match", "router.discover + match"],
    ["Loaders", "page + layouts, parallel"],
    ["Render", "streaming SSR"],
    ["HTML", ".frost response"],
    ["Hydrate", "client reconnects"],
  ];
  const bw = 116, gap = 24, x0 = 30, y = 120, bh = 64;
  const totalW = steps.length * bw + (steps.length - 1) * gap;
  const startX = (w - totalW) / 2;
  const boxes = steps.map(([name, sub], i) => {
    const x = startX + i * (bw + gap);
    const isBoundary = i === 5; // HTML crosses to client
    return `<g>
<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="${boxFill}" stroke="${isBoundary ? t.mint : boxStroke}" stroke-width="${isBoundary ? 1.6 : 1}"/>
<text x="${x + bw / 2}" y="${y + 28}" text-anchor="middle" font-family="${SANS}" font-size="14" font-weight="600" fill="${labelFill}">${name}</text>
<text x="${x + bw / 2}" y="${y + 46}" text-anchor="middle" font-family="${MONO}" font-size="9.5" fill="${subFill}">${sub}</text>
${i < steps.length - 1 ? `<path d="M${x + bw + 4} ${y + bh / 2} h${gap - 8}" stroke="${subFill}" stroke-width="1.4" marker-end="url(#arr)"/>` : ""}
</g>`;
  }).join("\n");
  // boundary line between server (left) and client (right)
  const boundaryX = startX + 5 * (bw + gap) - gap / 2;
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

// ---------- 5. feature icons (24px, stroke 1.75, mint) ----------
const ICONS = {
  "icon-routing": `<path d="M4 6h6l3 4-3 4H4z"/><path d="M14 14h6l3-4-3-4h-6"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/>`,
  "icon-loader": `<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>`,
  "icon-contract": `<path d="M9 4h6M10 4c0-1.7 4-1.7 4 0v3c0 4-2 6-2 9h-4c0-3-2-5-2-9z"/><path d="M10 19h4"/>`,
  "icon-boundary": `<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>`,
  "icon-refresh": `<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>`,
  "icon-error": `<path d="M12 4l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/>`,
  "icon-stream": `<path d="M3 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2"/><path d="M3 13c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2"/><path d="M3 18c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2"/>`,
  "icon-middleware": `<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8.5 12h7"/><path d="M12 9.5v5" opacity="0.5"/>`,
  "icon-rpc": `<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M12 12v4"/><path d="M8 20h8"/>`,
  "icon-test": `<path d="M9 3h6M10 3v5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-10V3"/><path d="M8 15h8"/>`,
};
function icons() {
  const files = {};
  for (const [name, d] of Object.entries(ICONS)) {
    files[`${name}.svg`] = svgWrap({
      w: 24, h: 24, title: name, vb: "0 0 24 24",
      body: `<g fill="none" stroke="#0b8f7e" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</g>`,
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

// ---------- 7. social preview ----------
function social(t) {
  const w = 1280, h = 640;
  const dark = t === DARK;
  const style = `
.glow{animation:drift 18s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(50px,-24px)}}
${REDUCED}`;
  const body = `
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bgTop}"/><stop offset="1" stop-color="${t.bgBottom}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${dark ? "rgba(16,232,200,0.18)" : "rgba(11,143,126,0.16)"}"/><stop offset="1" stop-color="${dark ? "rgba(16,232,200,0)" : "rgba(11,143,126,0)"}"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<ellipse class="glow" cx="1050" cy="120" rx="420" ry="260" fill="url(#glow)"/>
<ellipse class="glow" style="animation-delay:-9s" cx="200" cy="560" rx="380" ry="220" fill="url(#glow)"/>
${logoMark(530, 190, 4.4, t.mint, t.mintSoft, t.tealDeep)}
<text x="640" y="400" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="110" letter-spacing="6" fill="${t.inkHi}">FROST</text>
<text x="640" y="470" text-anchor="middle" font-family="${MONO}" font-size="30" fill="${t.mint}">React rendering. Web-native runtime.</text>
<text x="640" y="530" text-anchor="middle" font-family="${SANS}" font-size="20" fill="${t.inkDim}">npm create frost-app@latest my-app</text>
`;
  return svgWrap({ w, h, title: "Frost — social preview", body, style });
}

// ---------- emit ----------
const files = {
  "banner-dark.svg": banner(DARK),
  "banner-light.svg": banner(LIGHT),
  "terminal-dark.svg": terminal(DARK),
  "terminal-light.svg": terminal(LIGHT),
  "overlay-dark.svg": overlay(DARK),
  "overlay-light.svg": overlay(LIGHT),
  "lifecycle-dark.svg": lifecycle(DARK),
  "lifecycle-light.svg": lifecycle(LIGHT),
  "divider.svg": divider(),
  "social-dark.svg": social(DARK),
  "social-light.svg": social(LIGHT),
  ...icons(),
};
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), content);
}
console.log(`build-readme-assets: wrote ${Object.keys(files).length} SVGs to docs/assets/`);
