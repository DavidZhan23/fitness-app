# M-2026-05: 豆乳清茶主题（soy-tea）

**Status:** done  
**Branch:** main (local)

## Goal

第 10 套浅色皮肤「豆乳清茶」：豆乳色卡视觉取样作主调；海盐奶绿图 4 号视觉淡黄作运动热力图。

## 色卡取样（2026-05 重刷）

条下印刷 hex 与色块错位，以 PNG 条心取样为准：

| 豆乳清茶 号 | Hex | 用途 |
|-------------|-----|------|
| 1 | `#798C76` | 深焙、选中描边、缺口 L4 |
| 2 | `#E4EEE6` | **页底** |
| 3 | `#BAD9B7` | 主卡、记运动页底 |
| 4 | `#A3C5AA` | 主操 |

| 海盐奶绿 号 | Hex | 用途 |
|-------------|-----|------|
| 4 | `#F9F8E4` | 运动热力图锚点 |

## Delivered

- `src/styles/themes/soy-tea.css` — 全 token + 显式 deficit 阶
- `StyleContext` / `SettingsPage` / `themes/index.css`
- `src/index.css` — swatch、log 页、pill 等与取样色一致

## 文案对比度（2026-05-28）

- 阅读 token：`--text-ink` / `--text-primary` 墨绿 `#2F3C2D`；`--text-muted` `#4A5A48`（卡/页 ≥4.5:1），不再用装饰色 `#798C76` 作弱文案。
- BMR 公式区：浅底 + 墨绿字（对齐樱雾漫境模式）。

## Acceptance

- [x] 页底 `#E4EEE6`、主卡 `#BAD9B7`
- [x] 运动墙淡黄、缺口墙 2→3→4→1 豆乳阶
- [x] `npm run verify`

## Refs

- ADR: `docs/decisions/0007-theme-tokens.md`
