# 011 — Rendering modes: remove dead config, defer SSG

## Context
`config.rendering.default` and the per-route `rendering` export
(`RenderingMode`/`RenderingConfig`) existed but nothing read them —
every page was always SSR'd. Audit F-phase-4 required either real
static generation or removal of the dead config.

## Options
1. Implement `frost build --static` with per-route params export —
   real feature, multi-day scope (param enumeration, revalidation,
   ISR semantics).
2. Remove the unused config/types and document SSR-only rendering.

## Decision
Option 2. Removed `config.rendering`, `RouteModule.rendering`,
`RenderingMode`, and `RenderingConfig`. All routes render on the
server; caching stays explicit via `cache` config and per-route
`headers`.

## Consequences
- BREAKING (types only): code referencing `rendering` exports or
  `RenderingMode` must drop them. No runtime behavior changes —
  the fields were never read.
- Static generation can return later as a new, actually-implemented
  feature rather than a dead knob.
