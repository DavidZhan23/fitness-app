# ADR-0007: Theme color tokens and semantic CSS utilities

**Status:** accepted  
**Date:** 2026-05-27 · **Revised:** 2026-05-28（`cream` → `lavender` 薰衣云梦）

## Context

The app supports visual styles via `data-style` on the document root. The original `dream` implementation remapped many Tailwind utility classes with wildcard selectors (`[class*='bg-slate-']`), which was fragile and produced inconsistent light-theme results. Heatmap cells used hard-coded Tailwind color classes in `src/lib/calories.ts`, coupling data visualization to a single dark palette.

In a follow-up review the single `dream` palette was found to break马卡龙 (macaron) color discipline: page (`#FCE1F0` warm pink) and card (`#D6E2F0` cool gray-blue) had reversed color temperature at near-equal lightness, accent blue and pink had mismatched chroma, and the heatmap dark step (`#2B5F9E`) was too close to navy.

We want a path toward uploading a color palette from a developer console without touching React components, and we want users to choose among multiple light themes.

## Decision

1. **Theme = one set of CSS custom properties** defined on `:root` (default / 深海能量) and overridden per light theme. **Palette source files** live under [`src/styles/themes/`](../../src/styles/themes/) (`default.css`, `abyssal-jade.css`, `lavender.css`, `sakura.css`, `sakura-blush.css`, `active-mint.css`, `eva.css`, `eva-unit02.css`, `gundam-hangar.css`), aggregated by `src/styles/themes/index.css` and imported from `src/index.css` before semantic utilities:
   - `[data-style='lavender']` — **薰衣云梦** (Lavender Cloud): 云雾淡紫底 `#F8F2FF`、奶白紫卡 `#FFFBFF`；主操作薰衣草紫 `#B89AF4`；运动紫蓝、饮食玫瑰紫粉；缺口热力图走淡紫阶梯。
   - `[data-style='sakura']` — **樱海晴梦** (Pink & Sky): 奶粉页底 `#FFF4F8`、白粉卡 `#FFF9FC`；运动走亮蓝、饮食走甜粉；主操作 `#84BDF5`。
   - `[data-style='sakura-blush']` — **樱粉云境** (Sakura Blush): 樱花粉底 `#FFE7F0`、奶粉卡 `#FFF0F6`；运动亮蓝、饮食莓粉；缺口热力图薄荷绿阶梯；主操作 `#82B8F4`。
   - `[data-style='active-mint']` — **轻氧薄荷** (Active Mint): 薄荷雾绿底 `#EAF8F3`、奶白薄荷卡 `#F6FFFB`；主操作薄荷青绿 `#45B8A6`；运动清透蓝、饮食珊瑚橙、缺口绿；记饮食页暖杏底 `#FFF3E6`（`index.css` 局部覆盖）。
   - `[data-style='eva']` — **暴走初号机** (EVA Berserk Unit-01): 深黑紫机甲底 `#160B24`、初号机紫主操 `#6B35D7`、荧光绿运动/缺口、插入栓橙饮食；缺口热力图绿系深底阶梯；BMR 公式条 `#160B24`。
   - `[data-style='eva-unit02']` — **烈焰二号机** (EVA Unit-02 Asuka Overdrive): 深黑红驾驶舱 `#17080C`、二号机红主操 `#D7192A`、荧光绿运动/缺口、明日香橙黄饮食；Hero 橙顶能量线；底栏红胶囊 + 橙边（`index.css` 覆盖）；BMR 公式条 `#A80F1F`。
   - `[data-style='gundam-hangar']` — **格纳库提坦斯** (Titans Hangar): 深黑蓝底 `#0E1624`、装甲面板 `#182638` / `#203249`；钢蓝主操 `#425F8A`、高亮 `#7FA5D1`；冷青运动/缺口、琥珀饮食；缺口热力图青绿阶梯；BMR 公式条 `#101A28`；底栏选中钢蓝胶囊 `#203249` + 浅字（`index.css` 覆盖）。
   - `[data-style='abyssal-jade']` — **深海能量 2** (Abyssal Jade): 深墨绿底 `#061B17`、深海绿卡 `#0C2A25` / `#123A33`；翡翠主操 `#35D6A4`、荧光青运动 `#46E6D1` / `#5AD7EA`、青柠缺口 `#A6F36F`、珊瑚橙饮食 `#FF9F64`；与格纳库蓝黑工业风刻意区分；底栏选中墨绿胶囊 + 翡翠边（`index.css` 覆盖）；记饮食页珊瑚 AI/chip 局部覆盖。
   - Tokens include surfaces, text, accent families (exercise / meal), **`--accent-pop*`** (醒目点缀：薰衣=薰衣草紫、樱海=蓝、暴走初号机=初号机紫、烈焰二号机=二号机红、轻氧薄荷=薄荷青、格纳库=钢蓝、深海能量2=翡翠绿、深海=运动色), danger, and heatmap level colors (`--heatmap-*`).

2. **Semantic utility classes** remain in `src/index.css` (e.g. `.surface-card`, `.text-primary`, `.theme-quick-action--exercise`, `.heatmap-exercise-3`) and read from tokens. Pages adopt these only on key containers—not a full Tailwind rewrite.

3. **Heatmap palettes** in `calories.ts` export stable class names (`heatmap-exercise-1`, etc.) whose `background-color` is set in CSS from tokens.

4. **Page backgrounds are solid** in light themes; gradients are limited to small UI (style swatches, subtle decorations on achievement cards).

5. **Light-theme utility overrides** (e.g. `text-slate-*`, `community-pill--*`, `community-card-elite`) use **a shared selector** `[data-style='lavender'] xxx, [data-style='sakura'] xxx, … [data-style='gundam-hangar'] xxx` so adding a new theme requires a token block plus appending the slug to shared override groups in `index.css` (and theme-specific blocks where needed, e.g. community badges, tabbar active text on dark capsules).

6. **Future custom themes** can add `[data-style='custom-<id>']` with the same token names; no component changes required.

7. **Cookie compatibility**: `StyleContext.normalizeStyle` maps legacy `dream` → `sakura`, legacy `cream` → `lavender`, legacy `aqua`（雾海潮蓝，已下线）→ `sakura`. `useEffect` rewrites the cookie to the new value on next mount.

## Consequences

### Positive

- Predictable theming; light themes no longer depend on wildcard class hacks.
- Clearly differentiated light palettes with disciplined semantic color roles.
- Heatmaps and achievement cards automatically follow the active palette.
- Shared override selectors → adding a new light theme = one new token block + one new style-option / swatch pair.

### Negative

- Some components still use raw Tailwind colors; light themes may need occasional targeted overrides until migrated.
- Two sources of truth temporarily: Tailwind `@theme` legacy aliases and semantic tokens (kept in sync in `index.css`).
- Achievement-card decorative effects currently share a single pink-blue glow across light themes; per-theme glow differentiation is a follow-up if needed.
