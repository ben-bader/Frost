# Frost starter — design notes

"Glass bubble" atmosphere: deep teal field with soft haze patches, a large
translucent bubble cluster behind the hero, grotesque display type, pill
buttons, and ruled text blocks instead of cards.

## Palette (locked)

- `--teal-950` `#0a1a1c` — deepest surface (dropdowns, code panels)
- `--teal-900` `#10282a` — base page tone
- `--teal-800` `#173435` — lifted band (inner pages), hover surface
- `--teal-700` `#1f4647`, `--teal-600` `#2a5a5a` — haze gradients only
- `--haze` `#367272` — corner light patches only
- `--text-hi` `#f2f7f5`, `--text-body` `#bccfcb`, `--text-lo` `#8faba6`
  (`--text-lo` never sits over the glass shape, haze, or `--teal-600`)
- `--line` `#2c4d4b` — hairlines and ruled-block borders
- `--accent` `#0af3c5`, `--accent-hover` `#06d0a8`, `--accent-ink` `#04201b`
- `--status-danger` `#ff9d9d` — error text only (no token exists for errors)

## Atmosphere

`body::before` (fixed, z -1) holds the only gradients on the page: three
radial haze patches plus one vertical teal fade. No animation, no noise,
no backdrop-filter.

## Logo

`public/frost-mark.png` + `public/frost-wordmark.png` are luminance-keyed
cutouts of the supplied ribbon logo (unmodified artwork). Header lockup
32px tall; footer mark 24px. Favicon derives from the mark only.

## Glass shape

`public/Translucent Teal Bubble Cluster.png` (supplied, unmodified) with a
WebP derivative `Translucent_Teal_Bubble_Cluster.webp` (1600px, q85, ~217KB
vs 1.85MB) served via `<picture>`. Centered behind the hero stack at
`clamp(520px, 56vw, 860px)`, slow 22s drift, `pointer-events: none`.

## Type

Space Grotesk 400/500 (UI + display) and Space Mono 400/700 (labels,
buttons, data), self-hosted via `@fontsource/*/latin` imports in CSS.
Headline `clamp(2.5rem, 5vw, 4.5rem)` weight 500; section titles
`clamp(1.75rem, 3vw, 2.5rem)` weight 400. Eyebrows/buttons/block text are
mono uppercase.

## Structure

88px sticky header (transparent → `rgb(10 26 28 / .92)` + rule after 8px
scroll): logo, single nav with dot under `aria-current`, "More" disclosure
(SSR/Hydration/API/Adapter), two pill buttons. <640px collapses to logo +
MENU pill with a flat panel. Hero: centered stack over the glass shape —
rule, eyebrow, h1, lede, 3x3 dot-matrix scroll cue. "Explicit by design"
split section: copy + buttons left, Runtime kv block and Rendering mono
block right (real loader values, one accent status dot). "Explore Frost":
3x2 ruled-block links. Footer: mark + version, mono uppercase links.

## Motion

Hero stack fade-up (80ms stagger) and the two looping animations (shape
drift, cue pulse) are the only motion; all disabled under
`prefers-reduced-motion`. Hover transitions 150ms ease-out on
color/background/border only; the topic arrow nudge is the only transform.

## Rules

Radius exists only as pills (buttons) and the 12px dropdown panel. The
only gradients are in `body::before`. No shadows except the focus ring
(`outline: 2px solid var(--accent)`). `body { overflow-x: clip }` prevents
horizontal scroll from the intentionally oversized mobile shape without
breaking sticky. All content renders server-side; JS powers the header
disclosures, scroll state, and copy buttons. `<noscript>` fallback exposes
the nav links when JS is off.
