# Frost starter — design notes

"First frost": a clean ice field where structure comes from hairline rules, not boxes.

## Tokens (`src/styles/theme.css`)

- Surfaces: `--snow` page, `--ice-50/100` subtle fills, `--ice-200` hairlines, `--ice-300` decorative lines.
- Text: `--ink` headings/primary, `--slate-700` body, `--slate-500` meta.
- Accent: `--glacier` (links, primary action, focus, code keywords), `--glacier-strong` hover, `--aurora` (live marker, string tokens only).
- Status: `--danger` for errors.
- Dark theme via `prefers-color-scheme: dark` + `[data-theme]` override; midnight blue-black, never teal.

## Type

Geist (UI) + Geist Mono (code/data), loaded via Google Fonts with `display=swap`. Display `clamp(2.5rem,5.5vw,4.5rem)` w500; section titles 1.5rem w500; body 1rem/1.6; meta 0.875rem slate. One uppercase eyebrow max per page.

## Shape & space

Radius ≤4px (2px controls). Spacing 4-point scale `--space-1..10` (4→128px). Content `max-width:1120px`, gutter `clamp(16px,4vw,32px)`. Sections separated by 1px `--ice-200` rules — never cards.

## Rules

- No gradients, shadows, glows, or blur. Focus = 2px glacier outline.
- Accent only on primary button, links, focus, code keywords.
- One illustration: the crystalline SVG motif (hero only, `aria-hidden`).
- Status chrome limited to one aurora dot (server online).
- Sentence case, short concrete copy, verbs over adjectives.
- Everything SSR-rendered; JS only enhances (theme, copy, menu).
