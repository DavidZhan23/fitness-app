# Milestone: 今日热量结果文案与体重等价提示

**Status:** done
**Branch:** `main`
**Started:** 2026-06-06

## 1. 任务背景

今日页主卡当前使用带正负号的数字配合「kcal 缺口 / kcal 盈余」，用户需要先理解正负号规则；卡片也缺少热量结果对应体重变化量的直观提示。

## 2. 目标 (Goal)

今日页直接显示「热量缺口」或「热量过剩」，不再依赖正负号表达方向；在三项统计上方增加按 `7 kcal/g` 估算的体重变化说明。

## 3. 成功标准 (Success criteria)

- [x] 今日页主卡显示「热量缺口 N kcal」或「热量过剩 N kcal」，数字使用绝对值
- [x] 热量为 0 时显示「热量收支平衡 0 kcal」
- [x] 三项统计上方显示按 `7 kcal/g` 四舍五入后的体重变化等价值
- [x] 社区页共享卡片保持原有展示
- [x] 小屏幕下卡片无横向溢出

## 4. Non-goals

- 不修改热量缺口、基础代谢或体重的计算规则
- 不修改社区页、日历页的缺口文案
- 不将体重等价值解释为真实体重预测

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-05-today-page-layers.md`
- [x] `docs/milestones/M-2026-06-today-calorie-result-copy.md` 自身
- [x] `docs/architecture/api-contract.md`（本次不动 API，跳过）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 今日缺口计算 | `src/lib/metabolism.ts#calculateSpreadDeficit` | 是，不改计算 |
| 缺口主题色 | `src/lib/deficitGoal.ts#deficitGoalValueTone` | 是 |
| 缺口结果文案 | `src/lib/deficitGoal.ts` | 是，增加清晰结果格式化函数 |
| 今日结果主卡 | `src/components/DeficitCard.tsx` | 是，以可选参数扩展 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 今日 `deficit` 数值 | 明确方向的热量结果与按 `7 kcal/g` 估算的体重等价值 |

## 8. Edge cases

- `deficit > 0`：热量缺口、减轻等价值
- `deficit < 0`：热量过剩、增加等价值
- `deficit = 0`：热量收支平衡、体重基本不变
- 小数与极小值：热量和克数均四舍五入

## 9. 涉及文件 / 模块（预期）

- `src/components/DeficitCard.tsx`
- `src/pages/TodayPage.tsx`
- `src/lib/deficitGoal.ts`
- `src/lib/__tests__/deficitGoal.test.ts`
- `src/index.css`
- `e2e/today-responsive.spec.ts`
- `README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 为 `DeficitCard` 增加仅今日页开启的清晰结果与体重等价展示
2. 增加响应式样式及今日页 E2E 断言
3. 更新用户可见功能文档

**后续（不做）：**

- 将体重等价值扩展到社区页或日历页

## 11. 测试方案

- `npm run typecheck`
- `npm run check:today-responsive`

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 共享卡片改变社区页 | 使用默认关闭的可选参数，仅 TodayPage 开启 |
| 用户把等价值当作真实体重预测 | 文案明确使用「按 7 kcal/g 估算」和「约等价于」 |

## 13. 文档同步计划（合并前必须完成）

- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status 改 `done`
- [x] `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：回退 `DeficitCard` 的可选展示参数及相关样式、测试和文档。

## 15. 是否满足最小可运行闭环

是——用户打开今日页即可理解当前热量方向和对应的体重等价值。
