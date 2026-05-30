# Theme color palettes

Each file defines **CSS custom properties only** for one `data-style` value. Semantic utilities (`.surface-card`, `.community-segment__tab`, etc.) stay in [`src/index.css`](../index.css).

| File | Selector | 设置页名称 |
|------|----------|------------|
| `default.css` | `:root` | 深海能量 |
| `lavender.css` | `[data-style='lavender']` | 薰衣云梦 |
| `sakura.css` | `[data-style='sakura']` | 碧空樱缀 |
| `sakura-blush.css` | `[data-style='sakura-blush']` | 樱雾漫境 |
| `active-mint.css` | `[data-style='active-mint']` | 轻氧薄荷 |
| `soy-tea.css` | `[data-style='soy-tea']` | 豆乳清茶 |
| `wood-zen.css` | `[data-style='wood-zen']` | 木隐茶庭 |
| `eva.css` | `[data-style='eva']` | 暴走初号机 |
| `eva-unit02.css` | `[data-style='eva-unit02']` | 烈焰二号机 |
| `gundam-hangar.css` | `[data-style='gundam-hangar']` | 格纳库提坦斯 |
| `jojo-stardust-duel.css` | `[data-style='jojo-stardust-duel']` | 时停入侵 |

## Edit workflow

1. Open the palette file for the theme you are tuning.
2. Keep **token names** identical across all palette files (see ADR-0007).
3. Run `npm run verify` from repo root.

## Add a new theme

1. Copy `lavender.css` → `my-theme.css`, change selector to `[data-style='my-theme']`.
2. Add `@import './my-theme.css';` in `index.css` (this folder).
3. Extend `AppStyle` in `src/context/StyleContext.tsx`.
4. Append an entry in [`src/lib/styleOptions.ts`](../../lib/styleOptions.ts) with `group` and `sortHue` (`sortHue` = main visual hue for settings picker order). Add `style-swatch-*` / `style-option-*` in `src/index.css` if needed.

## Related docs

- [`docs/decisions/0007-theme-tokens.md`](../../../docs/decisions/0007-theme-tokens.md)
- [`docs/ops/theme-cutout-workflow.md`](../../../docs/ops/theme-cutout-workflow.md)
