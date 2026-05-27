# ADR-0007: Theme color tokens and semantic CSS utilities

**Status:** accepted  
**Date:** 2026-05-27 · **Revised:** 2026-05-27（拆分 `dream` → `cream` + `sakura`）

## Context

The app supports visual styles via `data-style` on the document root. The original `dream` implementation remapped many Tailwind utility classes with wildcard selectors (`[class*='bg-slate-']`), which was fragile and produced inconsistent light-theme results. Heatmap cells used hard-coded Tailwind color classes in `src/lib/calories.ts`, coupling data visualization to a single dark palette.

In a follow-up review the single `dream` palette was found to break马卡龙 (macaron) color discipline: page (`#FCE1F0` warm pink) and card (`#D6E2F0` cool gray-blue) had reversed color temperature at near-equal lightness, accent blue and pink had mismatched chroma, and the heatmap dark step (`#2B5F9E`) was too close to navy.

We want a path toward uploading a color palette from a developer console without touching React components, and we want users to choose among multiple light themes.

## Decision

1. **Theme = one set of CSS custom properties** defined on `:root` (default / 深海能量) and overridden per light theme:
   - `[data-style='cream']` — 奶霜马卡龙 / Cream Macaron: 米奶白主调 (`#FAF6F2`)，white cards，粉蓝点缀；accent C ≈ 0.08 on both sides.
   - `[data-style='sakura']` — 樱海粉梦: 粉雾底 + **蓝色 `--accent-pop`** 点缀（链接、主按钮、运动快捷、关注、Tab 选中等）；饮食语义仍用粉紫 `--accent-meal*`。
   - `[data-style='aqua']` — 雾海潮蓝: 水蓝底 + **粉紫 `--accent-pop`** 点缀（关注、点赞、记饮食快捷、AI 按钮等）；运动语义仍用水蓝。
   - Tokens include surfaces, text, accent families (exercise / meal), **`--accent-pop*`** (醒目点缀：樱海=蓝、雾海=粉紫、奶霜/深海=运动色), danger, and heatmap level colors (`--heatmap-*`).

2. **Semantic utility classes** in `src/index.css` (e.g. `.surface-card`, `.text-primary`, `.theme-quick-action--exercise`, `.heatmap-exercise-3`) read from tokens. Pages adopt these only on key containers—not a full Tailwind rewrite.

3. **Heatmap palettes** in `calories.ts` export stable class names (`heatmap-exercise-1`, etc.) whose `background-color` is set in CSS from tokens.

4. **Page backgrounds are solid** in light themes; gradients are limited to small UI (style swatches, subtle decorations on achievement cards).

5. **Light-theme utility overrides** (e.g. `text-slate-*`, `community-pill--*`, `community-card-elite`) use **a shared selector** `[data-style='cream'] xxx, [data-style='sakura'] xxx` so adding a new light theme only requires adding a token block, not duplicating override blocks.

6. **Future custom themes** can add `[data-style='custom-<id>']` with the same token names; no component changes required.

7. **Cookie compatibility**: `StyleContext.normalizeStyle` maps legacy `dream` cookies to `sakura` (the temperate-pair re-tune of the original dream palette). `useEffect` rewrites the cookie to the new value on next mount.

## Consequences

### Positive

- Predictable theming; light themes no longer depend on wildcard class hacks.
- Two clearly differentiated macaron palettes (cream-led vs pink-led) with disciplined L*/C* alignment.
- Heatmaps and achievement cards automatically follow the active palette.
- Shared override selectors → adding a new light theme = one new token block + one new style-option / swatch pair.

### Negative

- Some components still use raw Tailwind colors; light themes may need occasional targeted overrides until migrated.
- Two sources of truth temporarily: Tailwind `@theme` legacy aliases and semantic tokens (kept in sync in `index.css`).
- Achievement-card decorative effects currently share a single pink-blue glow across both light themes; if cream's warm-cream base needs differentiated glow this will require a follow-up override block.
