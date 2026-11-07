# Frost starter — design notes

Flat, deep, quiet developer-tool aesthetic in the logo's teal. Tonal bands
and hairline rules instead of cards, shadows, or gradients.

## Palette (from Frost_Teal_Ribbon_Logo.png — locked)

- `--void` `#010a09` — header, footer, hero
- `--ground` `#02110e` — page background, "how it works"
- `--band` `#061b16` — lifted bands, console, topics index
- `--panel` `#0a241d` — code panels, console log inset
- `--hover` `#0f3027` — hover surface
- `--line` `#16392f`, `--line-strong` `#24594a` — hairlines, motif strokes
- `--text-hi` `#ecf4ed`, `--text-body` `#b4cbc4`, `--text-lo` `#84a89d`
- `--accent` `#0af3c5` — primary button, focus ring, status marker, code
  keywords, active nav underline only. `--accent-hover` hovers,
  `--accent-deep` large text/borders, `--accent-shadow` selection.

## Logo

`public/frost-mark.png` + `public/frost-wordmark.png` are luminance-keyed
cutouts of `Frost_Teal_Ribbon_Logo.png` (unmodified artwork, transparent
backgrounds). `favicon.png`/`favicon.ico`/`favicon-512.png` derive from the
mark only.

## Type

Poppins (bundled via `@fontsource/poppins`) for UI; system mono for code,
logs, versions, data. Headings weight 500, sentence case, no uppercase
labels. Headline `clamp(2.5rem, 5.5vw, 4.25rem)`.

## Structure

64px sticky header (logo lockup, text nav, version, Menu <640px). Hero on
`--void` with one ribbon-echo line motif (hidden <1024px). Runtime console
is the only bordered panel: title bar, status row (one accent status dot),
log body on `--panel`. "How it works" = three blocks with left rules.
Topics = six ruled rows. Footer on `--void`. Radius max 2px on controls;
everything else square.

## Rules

No gradients, shadows, glows, blurs, or pills. Spacing only from the 8px
scale. Focus: `outline: 2px solid var(--accent)`. All content renders
server-side; JS only powers copy buttons and the menu.
