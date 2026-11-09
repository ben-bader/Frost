#!/usr/bin/env node
// Validates docs/assets SVGs against GitHub-rendering rules.
// Run: pnpm docs:check-assets
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(root, "docs", "assets");
const MAX_FILE = 150 * 1024;
const MAX_TOTAL = 1024 * 1024;

const failures = [];
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith(".svg"));
let total = 0;

const BANNED = [
  [/<script/i, "<script>"],
  [/<foreignObject/i, "<foreignObject>"],
  // xmlns namespaces and localhost URLs in text content are not fetched
  [/https?:\/\/(?!www\.w3\.org\/|localhost|127\.0\.0\.1)/i, "external URL"],
  [/@import/i, "@import"],
  [/xlink:href\s*=\s*["'](?!#)/i, "external xlink:href"],
  [/href\s*=\s*["'](?!#|data:)/i, "external href"],
];
// data: URIs are allowed only for tiny vectors — we ban raster data URIs.
const RASTER_DATA = /data:image\/(png|jpe?g|gif|webp|bmp)/i;

for (const f of files) {
  const p = path.join(ASSETS, f);
  const text = fs.readFileSync(p, "utf8");
  const size = Buffer.byteLength(text);
  total += size;
  if (size > MAX_FILE) failures.push(`${f}: ${size}B exceeds 150KB`);
  if (!/<svg[^>]*viewBox=/i.test(text)) failures.push(`${f}: missing viewBox`);
  for (const [re, what] of BANNED) {
    if (re.test(text)) failures.push(`${f}: contains ${what}`);
  }
  if (RASTER_DATA.test(text)) failures.push(`${f}: embedded raster data URI`);
  if (/<image\b/i.test(text)) failures.push(`${f}: <image> element`);
  // animation rules: CSS keyframes only, transform/opacity only,
  // reduced-motion guard required when animation present
  if (/animation:|@keyframes|<animate/.test(text)) {
    if (/<animate/.test(text)) failures.push(`${f}: SMIL <animate> (use CSS transform/opacity)`);
    if (!/prefers-reduced-motion/.test(text)) {
      failures.push(`${f}: animation without prefers-reduced-motion guard`);
    }
    const animProps = [...text.matchAll(/animation:[^;}"]*/g)].map((m) => m[0]);
    for (const a of animProps) {
      if (/animation:\s*[^;]*\b(?!opacity|transform|animation)[a-z-]+\s*[\d.]+s/.test(a) && /\b(width|height|top|left|right|bottom|margin|padding|color|fill|stroke|font-size|background)\b/.test(a)) {
        failures.push(`${f}: suspicious non-transform/opacity animation "${a.trim()}"`);
      }
    }
  }
}
if (total > MAX_TOTAL) failures.push(`total assets ${total}B exceeds 1MB`);
if (files.length === 0) failures.push("no SVG assets found");

// README <img>/<source> references must exist
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
for (const m of readme.matchAll(/(?:src|srcset)="(docs\/assets\/[^"]+)"/g)) {
  const rel = m[1].split(" ")[0];
  if (!fs.existsSync(path.join(root, rel))) failures.push(`README references missing ${rel}`);
}

if (failures.length) {
  console.error("check-assets FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`check-assets OK — ${files.length} SVGs, ${(total / 1024).toFixed(0)}KB total`);
