# Milestone: 今日页四层信息层级重构

**Status:** done
**Branch:** `feat/today-page-layers`
**Issue:** （可选）
**Started:** 2026-05-31

## 1. 任务背景

今日页信息密度高，新用户不易理解「今日结果是什么 / 为什么 / 有没有打卡 / 记录了什么」。可与「记饮食 / 记运动两 Tab 重做」并行推进，但**必须作为独立 milestone**，避免与 LogPage 记录流程混在一起。

## 2. 目标 (Goal)

将 `TodayPage` 整理成四层信息结构：结果层（缺口 + 计算解释）、打卡层（记运动 / 记饮食）、反馈层（运动墙 / 美食墙 / 称号点亮）、记录层（TodayRecordsSection），降低理解成本，且不改变热量计算、称号规则与记录逻辑。

## 3. 成功标准 (Success criteria)

- [ ] 今日结果层出现轻量 `?` 解释入口（`aria-label="了解热量缺口怎么算"`）
- [ ] 点击后 Sheet 展示公式、名词解释、当前日数据、新手提示
- [ ] 今日打卡层「记运动 / 记饮食」入口路由与 class 不变
- [ ] 今日反馈层展示运动墙 / 美食墙；有记录时显示「今日已点亮」
- [ ] 称号按 category 渲染：exercise → 运动墙、meal → 美食墙、general → 底部综合横幅
- [ ] 无 honor 时不显示空横幅；不显示旧「继续记录」「点击记饮食」空态提示
- [ ] 今日记录层摘要可展开，编辑 / 删除 / 赞踩不受影响
- [ ] `CommunityDaySummary` 默认不出现 `?` 按钮（`showExplanationButton` 默认 `false`）
- [ ] 390px 无横向滚动
- [ ] `npm run typecheck` 与 `npm run verify`（或今日页 smoke/e2e）通过

## 4. Non-goals

- 不改 `server/**`、后端 API
- 不改 `communityBadges` 阈值逻辑、`metabolism.ts`、`calories.ts`、缺口计算公式
- 不改运动 / 饮食保存逻辑、LogPage 记录流程
- 不改社区页展示、`PersonalDayStatus` 其他 variant
- 不改 `TodayRecordsSection` 交互
- 不改热力图数据逻辑

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-05-today-page-layers.md` 自身
- [x] `.cursor/rules/06-reuse-first.mdc`
- [ ] `docs/architecture/api-contract.md`（本次不动 API，跳过）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 缺口 / 基础消耗计算 | `src/lib/metabolism.ts#calculateSpreadDeficit`、`getAccumulatedMetabolism` | 是，TodayPage 已有 |
| 缺口单位文案 | `src/lib/deficitGoal.ts#formatDeficitGoalStatus` | 是，Sheet 今日结果行 |
| 统计标签 | `src/lib/calories.ts` `EXERCISE_KCAL_STAT_LABEL` / `MEAL_KCAL_STAT_LABEL` | 是 |
| 称号列表 | `src/lib/communityBadges.ts#listPublicHonorBadges` | 是 |
| Bottom sheet 模式 | `src/components/DeficitGoalSheet.tsx` | 是，portal / backdrop / scroll lock |
| 称号文案 icon | `CommunityDayStatus.tsx` 内 `TODAY_HONOR_STRIP` | 抽到 `todayHonors.ts` 复用 |
| 缺口主卡 | `src/components/DeficitCard.tsx` | 扩展，非重写 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| `TodayPage` 已有 dayLog / exercises / meals / profile 数据 | 四层 UI：DeficitCard+Sheet、打卡入口、TodayFeedbackCard、TodayRecordsSection |
| `listPublicHonorBadges` + 记录条数 | 运动墙 / 美食墙点亮状态 + 分类称号横幅 |

## 8. Edge cases

- **空数据：** 两墙均「未点亮」，无 honor 时不渲染横幅
- **仅运动 / 仅饮食：** 对应墙点亮，另一墙未点亮
- **CommunityDaySummary：** 不传 `showExplanationButton`，不出现 `?`
- **390px：** Sheet 内容区 `max-height ~70vh` 可滚动；反馈墙 grid 不溢出
- **跨日：** 沿用 TodayPage 现有 `formatDateKey` + 60s tick，无新逻辑

## 9. 涉及文件 / 模块（预期）

**新建：**

- `src/components/CalculationExplanationSheet.tsx`
- `src/components/TodayFeedbackCard.tsx`
- `src/lib/todayHonors.ts`
- `src/lib/__tests__/todayHonors.test.ts`

**修改：**

- `src/components/DeficitCard.tsx`
- `src/pages/TodayPage.tsx`
- `src/index.css`
- `e2e/today-responsive.spec.ts`

**不改：**

- `server/**`、`TodayRecordsSection.tsx`、`CommunityDayStatus.tsx`（保留组件，Today 页移除 compact 用法）

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. **今日结果层** — `CalculationExplanationSheet` + `DeficitCard` 增加 `showExplanationButton`（默认 `false`）；TodayPage 传 `showExplanationButton={true}`
2. **今日打卡层** — 保持现有 Link 不变
3. **今日反馈层** — `todayHonors.ts` + `TodayFeedbackCard`；TodayPage 替换 `PersonalDayStatus compact`
4. **今日记录层** — 不动 `TodayRecordsSection`
5. **CSS** — `calc-explanation-sheet__*`、`today-feedback-*`
6. **测试** — `todayHonors.test.ts` + 扩展 `today-responsive.spec.ts`

**后续（不做）：**

- LogPage 两 Tab 重做（独立 milestone）
- 社区页 DeficitCard 开启解释按钮

### 页面最终顺序

1. 欢迎语（HeroGreeting）
2. 今日结果层 — DeficitCard + `?`
3. 今日打卡层 — 记运动 / 记饮食
4. 今日反馈层 — TodayFeedbackCard
5. 今日记录层 — TodayRecordsSection
6. 热力图 hint（保留）

### 一、CalculationExplanationSheet

Props：

```ts
{
  open: boolean
  onClose: () => void
  metabolismKcal: number
  metabolismLabel: string
  exerciseKcal: number
  mealKcal: number
  deficit: number
}
```

内容：公式、名词解释（含「饮食增加 / 饮食摄入」）、当前日数据、新手提示。CSS 前缀 `calc-explanation-sheet__*`。

### 二、DeficitCard

- 新增 `showExplanationButton?: boolean`，**默认 `false`**
- TodayPage 显式 `showExplanationButton={true}`
- `?` 按钮 `aria-label="了解热量缺口怎么算"`
- 保留：大号缺口、目标缺口、三列统计、DeficitGoalSheet；不引入新计算

### 三、todayHonors.ts

- `classifyHonorCategory`: champion→exercise, foodKing→meal, elite→general
- `buildTodayHonors`: 基于 `listPublicHonorBadges` 顺序，附加 title/icon/desc/category

### 四、TodayFeedbackCard

Props: `{ exerciseCount, mealCount, honors }`

- 运动墙 / 美食墙点亮逻辑见 success criteria
- exercise/meal honor 在墙内；general honor 在 `.today-feedback-general`
- 移除旧 empty/reminder strip 行为

## 11. 测试方案

**单测** `src/lib/__tests__/todayHonors.test.ts`：

- champion → exercise
- foodKing → meal
- elite → general
- `buildTodayHonors` 顺序稳定

**E2E** 扩展 `e2e/today-responsive.spec.ts`：

1. `getByRole('button', { name: '了解热量缺口怎么算' })` 可见
2. 点击后断言「热量缺口 = 基础消耗 + 运动消耗 - 饮食摄入」
3. 断言「运动墙」「美食墙」
4. 390px 下 `.today-feedback-card` 无横向滚动
5. 保留 `.theme-deficit-stats` 断言

**Smoke：** `npm run verify`

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 与 LogPage Tab 重做分支冲突 | 独立 branch `feat/today-page-layers`，仅改 Today 相关文件 |
| DeficitCard 默认行为影响社区页 | `showExplanationButton` 默认 `false` |
| 390px 称号横幅挤爆 | `min-w-0`、墙内横幅换行、必要时单列 grid |
| TODAY_HONOR_STRIP 双处维护 | 抽到 `todayHonors.ts`，CommunityDayStatus 可选后续 import |

## 13. 文档同步计划（合并前必须完成）

- [ ] 根 `README.md`「功能」— 若用户可见信息架构变化明显则更新（可选，本次为体验整理）
- [ ] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert PR / 恢复 TodayPage 使用 `PersonalDayStatus compact`
- DB：无 schema 变更

## 15. 是否满足最小可运行闭环

是 — 纯前端展示重构，用户打开今日页即可验收四层结构与 Sheet，不依赖新 API。

---

**与 LogPage Tab 重做的关系：** 可并行开发，但不得在同一 PR 混合 LogPage 记录流程改动；合并顺序互不影响。
