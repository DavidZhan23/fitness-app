# ADR-0007: Theme color tokens and semantic CSS utilities

**Status:** accepted  
**Date:** 2026-05-27 · **Revised:** 2026-05-28（`cream` → `lavender`；打卡墙色阶与缺口连续统计跨主题统一；浅色文案对比度纪律；新增木隐茶庭）

## Context

The app supports visual styles via `data-style` on the document root. The original `dream` implementation remapped many Tailwind utility classes with wildcard selectors (`[class*='bg-slate-']`), which was fragile and produced inconsistent light-theme results. Heatmap cells used hard-coded Tailwind color classes in `src/lib/calories.ts`, coupling data visualization to a single dark palette.

In a follow-up review the single `dream` palette was found to break马卡龙 (macaron) color discipline: page (`#FCE1F0` warm pink) and card (`#D6E2F0` cool gray-blue) had reversed color temperature at near-equal lightness, accent blue and pink had mismatched chroma, and the heatmap dark step (`#2B5F9E`) was too close to navy.

We want a path toward uploading a color palette from a developer console without touching React components, and we want users to choose among multiple light themes.

## Decision

1. **Theme = one set of CSS custom properties** defined on `:root` (default / 深海能量) and overridden per light theme. **Palette source files** live under [`src/styles/themes/`](../../src/styles/themes/) (`default.css`, `lavender.css`, `sakura.css`, `sakura-blush.css`, `active-mint.css`, `soy-tea.css`, `wood-zen.css`, `eva.css`, `eva-unit02.css`, `gundam-hangar.css`, `jojo-stardust-duel.css`), aggregated by `src/styles/themes/index.css` and imported from `src/index.css` before semantic utilities:
   - `[data-style='lavender']` — **薰衣云梦** (Lavender Cloud): 云雾淡紫底 `#F8F2FF`、奶白紫卡 `#FFFBFF`；主操作薰衣草紫 `#B89AF4`；运动紫蓝、饮食玫瑰紫粉。
   - `[data-style='sakura']` — **碧空樱缀** (Sky Sakura Trim): 浅蓝天底 `#EEF6FC`、云白蓝卡 `#F7FBFF`；运动亮蓝、饮食甜粉；樱粉点缀（`--accent-pop`）；主操作 `#84BDF5`。
   - `[data-style='sakura-blush']` — **樱雾漫境** (Sakura Mist): 樱花粉底 `#FFE7F0`、奶粉卡 `#FFF0F6`；运动亮蓝、饮食莓粉；主操作 `#82B8F4`。
   - `[data-style='active-mint']` — **轻氧薄荷** (Active Mint): 薄荷雾绿底 `#EAF8F3`、奶白薄荷卡 `#F6FFFB`；主操作薄荷青绿 `#45B8A6`；运动清透蓝、饮食珊瑚橙；记饮食页暖杏底 `#FFF3E6`（`index.css` 局部覆盖）。
   - `[data-style='soy-tea']` — **豆乳清茶** (Soy Tea): 色条 PNG 视觉取样（条下印刷 hex 无效）— 豆乳图 1=`#798C76` 2=`#E4EEE6`（页底）3=`#BAD9B7`（主卡）4=`#A3C5AA`（主操）；阅读文案墨绿阶 `--text-ink`/`--text-primary`=`#2F3C2D`、弱文案 `--text-muted`≥4.5:1 on 卡/页（非装饰色 `#798C76`）；运动墙淡黄阶锚点海盐图 4=`#F9F8E4`；**显式** `--heatmap-deficit-*` = 豆乳 2→3→4→1；打卡墙连续统计卡 exercise/deficit 同色淡黄块（`#F9F8E4`/`#EDE8C4`）；选中日小结 = 代谢墙 `heatmap-*`（`index.css`）。
   - `[data-style='wood-zen']` — **木隐茶庭** (Wood Zen): 米纸原木页底 `#E9DDC8`、米杏卡 `#F3E8D7`、原木棕主操 `#9B6F45`；缺口苔绿、运动茶青、饮食柿橙三语义分工；热力图显式三套阶梯：`exercise` 茶青、`deficit` 苔绿、`surplus` 柿橙；底栏沉底木米色与浅米杏选中胶囊（`index.css` 局部覆盖）。
   - `[data-style='eva']` — **暴走初号机** (EVA Berserk Unit-01): 深黑紫机甲底 `#160B24`、初号机紫主操 `#6B35D7`、荧光绿运动、插入栓橙饮食；BMR 公式条 `#160B24`。
   - `[data-style='eva-unit02']` — **烈焰二号机** (EVA Unit-02 Asuka Overdrive): 深黑红驾驶舱 `#17080C`、二号机红主操 `#D7192A`、荧光绿运动、明日香橙黄饮食；Hero 橙顶能量线；底栏红胶囊 + 橙边（`index.css` 覆盖）；BMR 公式条 `#A80F1F`。
   - `[data-style='gundam-hangar']` — **格纳库提坦斯** (Titans Hangar): 深黑蓝底 `#0E1624`、装甲面板 `#182638` / `#203249`；钢蓝主操 `#425F8A`、高亮 `#7FA5D1`；冷青运动、暗红饮食/盈余；代谢墙缺口格与运动墙同色阶；打卡墙 Tab / 社区分段选中为暗红；BMR 公式条 `#101A28`；底栏选中钢蓝胶囊 `#203249` + 浅字（`index.css` 覆盖）。
   - `[data-style='jojo-stardust-duel']` — **时停入侵** (Time Stop Intrusion): 实色黑蓝底 `#070a12` / `#11182a`；承太郎钴蓝主操 `#3151c9`、运动蓝紫 `#476cff` / `#9b8cff`；DIO 金黄绿入侵 `#fff35a` / `#d6d930`（饮食/盈余/关注/今日标记）；热力图运动蓝紫阶、盈余金黄绿阶；Hero 联名图可选；底栏钴蓝胶囊 + 酸性黄图标（`index.css` 覆盖）。
   - Tokens include surfaces, text, accent families (exercise / meal), **`--accent-pop*`** (醒目点缀：薰衣=薰衣草紫、碧空樱缀=樱粉、樱雾漫境=蓝、轻氧薄荷=薄荷青、豆乳清茶=奶绿、木隐茶庭=竹叶黄绿、暴走初号机=初号机紫、烈焰二号机=二号机红、格纳库=钢蓝、深海=运动色), danger, and heatmap level colors (`--heatmap-*`).

1b. **Readable text contrast (light themes, 2026-05-28)**

   - Optional **`--text-ink`**: deepest body/link ink on the palette (often equals `--text-on-accent` on green themes, or a darkened hue cousin elsewhere).
   - **`--text-primary` / `--text-secondary` / `--text-muted`** must each achieve **≥ 4.5:1** against both **`--surface-card`** and **`--surface-page`** (WCAG AA normal text). Do not reuse mid-chroma accent/heatmap steps for muted body copy.
   - **`--text-link`** (optional): readable link/menu ink for `.text-brand` on cards; defaults to `--color-brand-dark` when unset. Bright `--color-brand` / `--accent-pop` may stay on buttons; links use ink.
   - **BMR formula block (light themes)**: **light panel + dark formula text** (see `sakura-blush.css`). Dark formula strips remain for EVA / 格纳库 / 深海等暗色主题.
   - Tuning aid: `node scripts/check-theme-contrast.mjs` (local, not CI).

1c. **Settings menu & sign-out (2026-05-28)**

   - **`--settings-menu-text` / `--settings-menu-chevron`**: collapsible row title and `▸` on Settings + InstallGuide (ink/link on light themes, `--text-primary` on dark).
   - **`--btn-sign-out-*`**: logout button only (theme accent; **not** `--danger-*`). Dark themes use pop/accent (e.g. EVA orange, Unit-02 yellow, Hangar steel blue).

2. **Semantic utility classes** remain in `src/index.css` (e.g. `.surface-card`, `.text-primary`, `.theme-quick-action--exercise`, `.heatmap-exercise-3`) and read from tokens. Pages adopt these only on key containers—not a full Tailwind rewrite.

3. **Heatmap palettes** in `calories.ts` export stable class names (`heatmap-exercise-1`, etc.) whose `background-color` is set in CSS from tokens. **Cross-theme aliases** in `index.css` on `[data-style]` (always set by `StyleContext`):
   - `--heatmap-deficit-1..4` → `--heatmap-exercise-1..4`（代谢墙「缺口」格默认与运动墙色阶一致）。
   - **例外 `soy-tea`**：在 `soy-tea.css` 内显式赋值 `--heatmap-deficit-*`（豆乳取样 2→3→4→1），特异性高于全局别名，使代谢墙缺口与运动墙淡黄阶分离。
   - 代谢墙「盈余」格：各主题 `--heatmap-surplus-*`（各主题自有色系，不全局别名）。
   - 打卡页「缺口连续」：各主题 `calendar-stat-deficit-*`；`soy-tea` 与缺口墙同豆乳取样系，与运动淡黄统计区分；**不**绑定盈余色。
   - Theme files define `--heatmap-exercise-*`、`--heatmap-surplus-*`、`--calendar-stat-deficit-*`；多数主题不重复 `heatmap-deficit-*`（由全局别名绑定 exercise）。
   - 打卡墙选中日：`--heatmap-day-selected-ring`、`--heatmap-day-selected-shadow`；组件类 `.heatmap-day--selected`（见 `MonthHeatmap`）。
   - 打卡墙今日提示（无描边、背景透明与格同色）：`--heatmap-day-today-label-text`；组件类 `.heatmap-day-today-label`（格内顶部居中「今日」）。
   - 打卡墙选中日「当日小结」：`CalendarPage` 使用 `.calendar-day-detail` + 与代谢墙同日 `getDeficitHeatmapClass` 的 `heatmap-*` 背景（非固定 `--surface-card`）。

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
