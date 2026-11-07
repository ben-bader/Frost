import React from "react";

/* Ribbon-echo motif: parallel hairlines at a single 60° angle, drawn in
   bundles of three with staggered lengths — echoes the logo's slanted
   ribbon cuts. ~24 segments, decorative only. */

const SIZE = 420;
const ANGLE = (60 * Math.PI) / 180;
const DX = Math.cos(ANGLE);
const DY = Math.sin(ANGLE);

interface Seg {
  d: string;
  len: number;
}

function buildSegments(): Seg[] {
  const segs: Seg[] = [];

  // Three bundle columns, each a fan of short parallel strokes.
  const bundles = [
    { x: SIZE * 0.62, y: SIZE * 0.30, n: 3 },
    { x: SIZE * 0.74, y: SIZE * 0.48, n: 3 },
    { x: SIZE * 0.58, y: SIZE * 0.62, n: 3 },
    { x: SIZE * 0.82, y: SIZE * 0.24, n: 3 },
    { x: SIZE * 0.68, y: SIZE * 0.74, n: 3 },
    { x: SIZE * 0.88, y: SIZE * 0.58, n: 3 },
    { x: SIZE * 0.50, y: SIZE * 0.44, n: 3 },
    { x: SIZE * 0.78, y: SIZE * 0.82, n: 3 },
  ];

  for (const b of bundles) {
    for (let i = 0; i < b.n; i++) {
      // stagger lengths and slight perpendicular offsets within a bundle
      const len = 46 + ((i * 37 + Math.floor(b.x)) % 96);
      const off = (i - 1) * 9 + ((Math.floor(b.y) % 7) - 3);
      const px = -DY * off;
      const py = DX * off;
      const x1 = b.x + px;
      const y1 = b.y + py;
      const x2 = x1 + DX * len;
      const y2 = y1 + DY * len;
      // keep inside the viewBox
      if (x2 > SIZE - 4 || y2 > SIZE - 4 || x1 < 4 || y1 < 4) continue;
      segs.push({
        d: `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`,
        len,
      });
    }
  }

  return segs.slice(0, 30);
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
          strokeWidth={1}
          style={{ ["--i" as string]: i }}
        />
      ))}
    </svg>
  );
}
