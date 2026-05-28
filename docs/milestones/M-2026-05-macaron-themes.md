# Milestone: 双马卡龙浅色主题 / Macaron Themes

**Status:** done
**Branch:** `feat/style-color-tuning`
**Started:** 2026-05-27

## 1. 任务背景

[M-2026-05-pink-blue-light-theme](M-2026-05-pink-blue-light-theme.md) 落地的 `dream`（粉蓝逸梦）在实际使用中观感「怪」，根因诊断：

1. `surface-page #FCE1F0` 暖粉与 `surface-card #D6E2F0` 冷灰蓝色温反向、明度近似，呈现「粉底蓝瓷砖」的撞块感
2. 蓝端 (`#80B2E5`, C≈0.09) 与粉端 (`#F8C2DA`, C≈0.05) 饱和度失衡，蓝看"塑料"，粉看"奶油"
3. 缺奶白/米白中性层；马卡龙审美中粉蓝是「点缀」而非「主战场」
4. heatmap 最深档 `#2B5F9E` 接近 navy，把浅色页面瞬间压沉

## 2. 目标 (Goal)

把单一的 `dream` 替换为两套**马卡龙调色逻辑**正确的浅色主题，名字全部重新起；用户在设置→风格可选 1/3 个主题。

- `default` 保留为「**深海能量**」（id 不变）
- 新 `cream` = 「**奶霜马卡龙**」（米奶白主调，粉蓝点缀）
- 新 `sakura` = 「**樱海漫梦**」（粉雾底 + 同温浅蓝卡片，蓝粉并存）

## 3. 成功标准 (Success criteria)

- [x] cream：page `#FAF6F2`、card `#FFFFFF`、card-soft `#F1ECE8`；运动/饮食 tint 蓝粉 chroma 拉齐 ~0.08
- [x] sakura：page `#FBE7EF`、card `#ECF3FB`（取代旧灰蓝 `#D6E2F0`），蓝粉同温
- [x] 两套主题 heatmap 最深档不再 navy（cream `#4D7BA0` / sakura `#3F75AE`）
- [x] 设置→风格三个选项独立预览渐变条 (`style-swatch-ocean / -cream / -sakura`)
- [x] 旧 cookie `fitness_style=dream` 自动迁移到 `sakura`，下次写入用新值
- [x] `default` 深色主题视觉无回归
- [x] `npm run verify` 全绿
- [x] 无 API / Schema 变更；StyleContext 仅扩展类型与 normalize

## 4. Non-goals

- 第 4 套主题或后台动态色卡
- 业务逻辑、社区算法、打卡规则改动
- 重新设计奖牌卡装饰（特效层在 cream 仍用旧 dream 粉蓝渐变；如需差异化再开 issue）

## 5. 已阅读的相关文档（必填）

- [x] [`docs/decisions/0007-theme-tokens.md`](../decisions/0007-theme-tokens.md)
- [x] [`docs/milestones/M-2026-05-pink-blue-light-theme.md`](M-2026-05-pink-blue-light-theme.md)
- [x] `.cursor/rules/06-reuse-first.mdc`

## 6. 已检查的可复用代码

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 主题切换 | `src/context/StyleContext.tsx` | 是，扩展 union + normalize 兼容 |
| 热力图档位 class | `src/lib/calories.ts` | 是，不动 |
| 浅色主题 utility 覆盖 | `[data-style='dream'] .text-slate-* / .community-pill--*` | 是，selector 改为 `cream, sakura` 共用 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 旧 `dream` 单一 token 块 | 两套独立 token：`[data-style='cream']` / `[data-style='sakura']` |
| 单一 `style-option-dream` / `style-swatch-dream` | 两套预览类 `-cream` / `-sakura` |
| 旧 cookie `dream` | 自动 normalize 到 `sakura` |

## 8. Edge cases

- 旧用户 cookie 已是 `dream`：normalize 返回 `sakura`，`useEffect` 后 cookie 写回为新值
- 任何浅色覆盖的 selector（`text-slate-*` / `community-pill--*` / `community-card-*`）都改成 cream + sakura 共用，避免漏改导致 cream 失效
- 装饰特效（奖牌卡渐变光）当前两套共用粉蓝渐变；cream 米白底配粉蓝光晕仍可读

## 9. 涉及文件 / 模块

- `src/index.css` —— token 拆 2 套；style-option / style-swatch 拆 2 套；浅色覆盖 selector 共用
- `src/context/StyleContext.tsx` —— `AppStyle` 三值 union；normalize 兼容旧 `dream`
- `src/pages/SettingsPage.tsx` —— `styleOptions` 三项；className 由数据驱动
- `docs/decisions/0007-theme-tokens.md` —— 注明拆分
- `docs/milestones/README.md` —— 登记本 milestone

## 10. 实现步骤

1. CSS token：删除 `[data-style='dream']`；新增 `[data-style='cream']`（方案 A 奶霜）+ `[data-style='sakura']`（方案 B 同温双拼）两整块
2. CSS 预览块：拆 `style-option-cream` / `style-option-sakura`，渐变条 `style-swatch-cream` / `style-swatch-sakura`
3. CSS 浅色覆盖：所有 `[data-style='dream'] xxx` selector 改为 `[data-style='cream'] xxx, [data-style='sakura'] xxx` 共用
4. `StyleContext.tsx`：union 改为 `'default' | 'cream' | 'sakura'`；normalize 增加 `dream → sakura` 兼容
5. `SettingsPage.tsx`：`styleOptions` 加 `optionClassName` 字段；map 时 `${optionClassName}--active` 即可
6. 文档：ADR-0007 + 新 milestone + README 登记
7. `npm run verify` 全绿

## 11. 测试方案

- `npm run verify`
- 手动：Settings 切换三个主题；检查 TodayPage hero / 「+记运动」「+记饮食」并排、CalendarPage 月历热图（最深档不砸）、CommunityPage 成员卡 + 热力区双色平衡、Templates / Setup 阅读舒适度
- 旧用户：浏览器 cookie 设为 `fitness_style=dream`，刷新应进入 sakura，settings 高亮樱海漫梦

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| cream 米白底上奖牌卡粉蓝渐变略不协调 | 视为后续 polish；本次只对齐 token + 主体卡片层级 |
| 浅色 utility 覆盖漏改 cream | 所有 `[data-style='dream']` selector 全部改为 `cream, sakura` 共用，全局 grep 0 残留 |
| 文档与 ADR 不同步 | 同 PR 同步更新 |

## 13. 完成记录

- 2026-05-27：双主题落地、cookie 兼容迁移、ADR / README 同步、`npm run verify` 全绿
