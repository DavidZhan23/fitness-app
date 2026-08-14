# Milestone: 饮食模板保存手填宏量

**Status:** done
**Branch:** `dev/huanghongli`
**Issue:**
**Started:** 2026-08-14

## 1. 任务背景

饮食模板目前只存名称、单位和热量。营养表手填的蛋白质/脂肪/碳水/添加糖在「存成模板」时被丢掉；之后用「模板记录」再记同一道菜，宏量为空，后台再次走 AI。

## 2. 目标 (Goal)

饮食模板可保存手填的蛋白质/脂肪/碳水/添加糖；模板管理页可改这些数。没有手填过宏量的模板，再用时仍走 AI 估算。

## 3. 成功标准 (Success criteria)

- [x] `meal_templates` 可存可空的 `protein_g/fat_g/carbs_g/sugar_g`（对应默认份量）
- [x] 模板管理页（仅饮食）可编辑这四项；选填；运动模板不变
- [x] 营养表手填宏量并「存成模板」时写入这四项；AI 记录存模板不写宏量
- [x] 同名同单位已存在则跳过，不覆盖
- [x] 「模板记录」用带宏量的模板记餐：按 `quantity / default_quantity` 缩放后写入餐食，`macros_source=user`；空字段仍后台 AI
- [x] 预置米饭/鸡胸肉等模板宏量保持空
- [x] `npm run verify`；api-contract / overview / README 同步

## 4. Non-goals

- 模板不存 16 项微量元素
- 不改运动模板
- 不自动用一次手录覆盖已有同名模板
- 模板卡片网格不展示四项克数（仍只显示热量；进管理页才改）

## 5. 已阅读的相关文档（必填）

- [x] `docs/architecture/api-contract.md`（实现时更新模板节）
- [x] `docs/architecture/overview.md` ER 节（实现时更新 meal_templates）
- [x] Grill 决策已写入文末（用户已确认 shared understanding）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 餐级宏量解析/校准 | `server/src/mealMacros.js`、`src/lib/macroTargets.ts#parseMacroDraft` | 是 |
| 模板 CRUD / 记饮食点选 | `src/lib/logTemplate.ts`、`TemplateFormDialog`、`usePendingLogDrafts` | 是，扩展字段，不平行造模板层 |
| 保存时宏量写入 | `submitLog` / `POST /meals` 已支持手填则 `macros_source=user`、空项后台 AI | 是 |
| 默认模板种子 | `src/lib/defaultTemplates.ts` | 是，宏量保持空 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 营养表手填宏量 + 存成模板 | 新模板带默认份量下的四项（可部分空） |
| 模板页编辑饮食模板 | PATCH 写入四项；空表示不固化、用时 AI |
| 模板记录点选并改数量 | 餐食宏量 = 模板克数 × (quantity / default_quantity)；空项不写，后台 AI |

## 8. Edge cases

- 四项全空：行为与现在相同，记餐后 AI 补宏量
- 只填部分：已填按比例带上且 `macros_source=user`，空项 AI 补
- 默认份量为 0 或不合法：已有模板校验拦住，不缩放
- 同名同单位：跳过，提示沿用现有「已存在同名同单位模板」
- 旧模板无新列：当作全空，仍 AI

## 9. 涉及文件 / 模块（预期）

- `server/migrations/039_meal_templates_macros.sql` + `server/src/db.js#runMigrations`
- `server/src/routes/logs.js` 模板 CRUD
- `src/lib/logTemplate.ts`、`src/types/index.ts`、`src/lib/api/index.ts`
- `src/features/templates/TemplateFormDialog.tsx`、`src/pages/TemplatesPage.tsx`
- `src/hooks/usePendingLogDrafts.ts` / `src/features/log/submitLog.ts`
- `src/features/log/SecondaryManualLogSection.tsx`（存模板时带上手填宏量）
- `docs/architecture/api-contract.md`、`overview.md`、根 `README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. Schema + 模板 API 贯通四项
2. 模板管理页饮食表单选填四项
3. 营养表存模板写入手填宏量；模板记录按比例带入记餐
4. 文档 + verify

**后续（不做）：**

- 卡片上展示宏量摘要
- 用一次手录合并进已有模板

## 11. 测试方案

- `logTemplate`：缩放、空字段不写、存模板只带手填
- `mealMacros` / 模板 normalize 解析
- Smoke：模板页仍可增改删；无宏量模板记餐仍成功
- 拟人探查：本轮本地未起 Vite/API，未做 Browser 拟人测；建议后续覆盖「营养表手填+存模板」与「模板记录改数量」

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 改数量后克数不准 | 线性缩放；空项仍 AI |
| 用户以为勾选存模板会更新旧模板 | 保持跳过；文案已有「已存在同名」 |
| 预置模板写死不准的营养 | 预置不填宏量 |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md` ER 节
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status → `done` + README 索引归档

## 14. 回滚方案

- 代码 revert PR
- DB：新列可空，回滚代码即可忽略列
- 部署上一 dist

## 15. 是否满足最小可运行闭环

是——管理页填四项或营养表手填后新建模板 → 模板记录再用 → 营养页看到手填缩放结果，空项仍估算中。

## Grill 决策摘要（已确认）

1. 模板只存蛋白质 / 脂肪 / 碳水 / 添加糖；微量仍按餐后台 AI
2. 克数按模板默认份量存；记餐改数量按比例缩放；空字段仍 AI
3. 「存成模板」只写入手填宏量；AI 估算值不落模板
4. 同名同单位已存在则跳过，不覆盖；到管理模板页补填
5. 四项选填；预置模板不预填数字
