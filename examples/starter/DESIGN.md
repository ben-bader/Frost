# Frost starter — design notes

Flat, deep, quiet developer-tool aesthetic. Tonal bands and hairline rules
instead of cards, shadows, or gradients.

## Palette (locked — original Frost tokens)

- `--background-deep` `#020a09` — page base, hero, index bands
- `--background-primary` `#04100e` — lifted bands, footer
- `--background-secondary` `#0a211d` — console, code panels
- `--band-hover` `#0f2a25` — derived hover tone (lightness shift only)
- `--line` / `--line-strong` — `rgba(186,255,236,0.09 / 0.18)` hairlines
- `--text-primary` `#e9f6f2`, `--text-secondary` `#a8ccc5`, `--text-muted` `#6d948b`
- `--brand-accent` `#00c9a8` mint — primary button, link hover, focus ring,
  status marker, code keywords only. `--brand-accent-strong` hovers,
  `--brand-accent-ink` text on accent.

## Type

Poppins (bundled via `@fontsource/poppins`) for UI; system mono stack for
code, logs, versions, and data. Headings weight 500, sentence case, no
uppercase labels. Headline `clamp(2.5rem, 5.5vw, 4.25rem)`.

## Structure

64px sticky header (favicon mark + wordmark, text nav, version, Menu <640px).
Hero with one accent line-motif SVG (hidden <1024px). Runtime console is the
only bordered panel: title bar, status row (one accent status dot), log body.
"How it works" = three blocks with left rules. Topics = six ruled rows.
Footer = lifted band. Radius max 2px on controls; everything else square.

## Rules

No gradients, shadows, glows, blurs, or pills. Spacing only from the 8px
scale (`--space-1`…`--space-10`). Focus: `outline: 2px solid var(--brand-accent)`.
All content renders server-side; JS only powers copy buttons and the menu.
