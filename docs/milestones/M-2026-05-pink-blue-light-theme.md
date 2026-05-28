# Milestone: 粉蓝逸梦 / Pink Blue Dream 主题

**Status:** done
**Branch:** `feat/style-color-tuning`
**Started:** 2026-05-27

## 1. 任务背景

现有 `dream` 主题依赖通配 `[class*='bg-slate-']` 重映射与全页渐变，浅色观感不稳定、易翻车。需替换为 token 化浅雾蓝实色主题，并为未来「后台上传色卡」铺路。

## 2. 目标 (Goal)

在 `data-style='dream'` 下呈现干净浅雾蓝实色页面、清晰卡片层级、运动蓝 / 饮食粉语义色与打卡墙蓝粉 4 档热力图；`default` 深色主题视觉无回归。

## 3. 成功标准 (Success criteria)

- [x] dream：页面背景 `#FCE1F0` 浅粉实色；卡片 `#F7FAFF`；主文字 `#2F405A`
- [x] dream：运动热力图蓝 4 档、盈余粉 4 档、空格 `#EAF3FC`
- [x] dream：「+ 记运动」蓝、「+ 记饮食」粉、「退出登录」rosePink
- [x] default：与改前深色一致
- [x] `npm run verify` 全绿
- [x] 无 API / Schema / StyleContext 类型变更

## 4. Non-goals

- 新增第三套主题或自定义主题上传 UI
- 全站 Tailwind 颜色类替换
- 业务逻辑、打卡规则、社区算法改动

## 5. 已阅读的相关文档（必填）

- [x] `docs/decisions/0007-theme-tokens.md`
- [x] `.cursor/rules/06-reuse-first.mdc`

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 热力图档位 class | `src/lib/calories.ts#getDeficitHeatmapClass` | 是，改语义 className |
| 主题切换 | `src/context/StyleContext.tsx` | 是，id 不变 |
| 缺口色阶算法 | `getDeficitHeatmapCell` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| `StyleContext` 的 `dream` / `default` | `index.css` token + 语义 utility |
| 现有页面 Tailwind 局部类 | 关键容器接入 `surface-*` / `text-primary` 等 |

## 8. Edge cases

- 深色 default 下语义 utility 须映射原 teal/amber 热力图色
- dream 下仍使用 `text-brand` 的链接须随 `--color-brand` 变蓝
- 社区 hero / 成就卡 banner 在 dream 下用实色而非全屏渐变

## 9. 涉及文件 / 模块（预期）

- `src/index.css`
- `src/lib/calories.ts`
- `src/pages/{Today,Calendar,Community,Templates,Settings}Page.tsx`
- `src/components/{Layout,CommunityDayStatus,SplitMonthWall}.tsx`
- `docs/milestones/README.md`
- `docs/decisions/0007-theme-tokens.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. `:root` + `[data-style='dream']` 全量 token
2. 热力图语义 class + CSS 绑 var
3. 语义 utility + 5 页关键容器接线
4. 文档 + verify

**后续（不做）：**

- 开发者后台动态注入 `[data-style='custom-*']`

## 11. 测试方案

- `npm run verify`
- 手动：Settings 切换 dream/default，浏览今日/打卡/社区/模板/设置

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 漏改 Tailwind 硬编码导致 dream 对比度差 | 关键容器用语义 class；dream 块有限 `[data-style]` 覆盖 |
| default 热力图色变化 | `:root` token 对齐原 Tailwind 色值 |

## 13. 完成记录

- 2026-05-27：`npm run verify` 全绿（lint/typecheck/unit/e2e/guards）
