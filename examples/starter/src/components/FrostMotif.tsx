import React from "react";

/* Deterministic sparse hexagonal lattice — "first frost" crystal lines.
   ~50 segments at 0°/60°/120°, fading from the top-right corner. */

const SIZE = 420;
const R = 34; // hex circumradius-ish spacing unit
const DX = Math.sqrt(3) * R;
const DY = 1.5 * R;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Seg {
  d: string;
  o: number;
}

function buildSegments(): Seg[] {
  const rand = mulberry32(0xf057);
  const segs: Seg[] = [];
  const pts = new Map<string, [number, number]>();

  for (let row = -1; row < 10; row++) {
    for (let col = -1; col < 9; col++) {
      const x = SIZE / 2 + (col - row / 2) * DX;
      const y = SIZE / 2 + row * DY - SIZE * 0.18;
      pts.set(`${col},${row}`, [x, y]);
    }
  }

  const neighbors: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 1],
  ];

  const cornerDist = (x: number, y: number) => Math.hypot(SIZE - x, 0 - y);

  for (const [key, point] of pts) {
    const [col, row] = key.split(",").map(Number) as [number, number];
    const [x1, y1] = point;
    for (const [dq, dr] of neighbors) {
      const n = pts.get(`${col + dq},${row + dr}`);
      if (!n) continue;
      const [x2, y2] = n;
      // deterministic per-edge hash so the pattern is stable
      const h = rand();
      if (h > 0.17) continue;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const fade = Math.max(0.06, 0.62 - cornerDist(mx, my) * 0.0011);
      segs.push({ d: `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`, o: fade });
    }
  }

  // Frost branches growing from the top-right corner.
  const branchAngles = [0, 60, 120, 30, 90, 150];
  for (let i = 0; i < 7; i++) {
    const a = ((branchAngles[i % branchAngles.length] ?? 0) * Math.PI) / 180;
    const len = 26 + ((i * 37) % 60);
    const spread = ((i * 53) % 40) - 20;
    const aa = a + (spread * Math.PI) / 180;
    const x1 = SIZE - 8 - i * 9;
    const y1 = 8 + i * 7;
    const x2 = x1 - Math.cos(aa) * len;
    const y2 = y1 + Math.sin(aa) * len * 0.6;
    segs.push({ d: `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`, o: 0.6 - i * 0.045 });
  }

  return segs;
}

const SEGMENTS = buildSegments();

export function FrostMotif(): React.JSX.Element {
  return (
    <svg
      className="motif"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      focusable="false"
    >
      {SEGMENTS.map((s, i) => (
        <path
          key={i}
          d={s.d}
          pathLength={100}
          style={{ ["--i" as string]: i, opacity: s.o }}
        />
      ))}
    </svg>
  );
}
