# Frost starter — design notes

"Frozen lake": one dark theme built from flat tonal bands and hairline fracture rules. No light mode, no toggle.

## Tokens (`src/styles/theme.css`)

- Bands, deepest → lightest: `--abyss` page/hero, `--deep` sections/footer, `--trench` runtime strip + code surfaces, `--slab` hover/active, `--fracture`/`--fracture-strong` rules and motif strokes.
- Text: `--text-hi` headings/values, `--text-body` body, `--text-lo` meta/keys.
- Accent: `--frost` (primary button, links on hover, focus ring, code keywords), `--frost-dim` (hover, strings), `--glint` (server-online marker only).
- Radius: `--radius: 2px` on buttons/code only; everything else 0.
- Spacing: 8px base, `--space-1..10` (4→128px). Section bands pad `--space-9` desktop / `--space-8` tablet / `--space-7` mobile.

## Rules

- Structure = full-bleed bands (`--abyss`/`--deep`/`--trench`) separated by 1px `--fracture` rules. No cards, no shadows, no gradients, no blur.
- Primary action is a pale `--frost` button with `--abyss` text — the single focal point.
- Logo is the project's `public/favicon.png`, unmodified, 24×24 in the header.
- Fonts: Geist + Geist Mono via Google Fonts (`display=swap`), injected through `Route.Metadata` links.
- Headings weight 500, sentence case, no uppercase labels. One `<h1>`, `<h2>` per section.
- JS only enhances: copy buttons and the mobile menu. Everything renders server-side.
