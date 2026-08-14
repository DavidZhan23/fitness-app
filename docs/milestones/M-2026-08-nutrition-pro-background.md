# Milestone: 营养后台 Pro 估算 + 计算中标识 + 食物明细

**Status:** done
**Branch:** `dev/huanghongli`
**Issue:**
**Started:** 2026-08-14

## 1. 任务背景

逐餐微量上线后，加餐不再出现明显的「正在估算」过程，用户会怀疑没算上。宏量目前是保存时同步等 Flash（最多约 8 秒），不是后台。用户希望：后台计算中有明确标识、微量页底部能看到哪些食物已计算，并把营养相关估算换成 DeepSeek Pro。

## 2. 目标 (Goal)

记餐保存立刻成功；蛋白质/脂肪/碳水/糖与微量都在后台用 `deepseek-v4-pro` 估算。营养页和微量页在询问模型时显示计算中标识。微量页底部列出当日食物及是否已估算。

## 3. 成功标准 (Success criteria)

- [x] 宏量不再阻塞 `POST/PATCH /meals`；保存成功后后台补全，营养页可见「估算中」并自动刷新
- [x] 微量保持后台；有餐正在问 DeepSeek 时，营养入口与微量页都有明确计算中标识（不会只留下旧快照却毫无提示）
- [x] 微量页底部食物明细：已估算 / 估算中 / 失败；已估算显示该餐微量元素估算量（不展示配料名）
- [x] 营养估算（宏量 + 微量）使用 `deepseek-v4-pro` 且开启 thinking；记运动热量、小狸仍用 Flash 并关闭 thinking
- [x] `npm run verify`；api-contract / README 同步

## 4. Non-goals

- 手填 16 项微量
- 改周报 / 狐狸 / 拍照视觉模型
- USDA 联网
- 营养首页铺开 16 项参考长列表（参考表仍在微量页）

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-08-meal-micronutrient-sum.md`
- [x] `docs/milestones/M-2026-08-daily-nutrition-macros.md`
- [x] `docs/architecture/api-contract.md`（实现时更新）
- [x] Grill 决策已写入文末（用户已确认 shared understanding）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 微量后台调度 / pending 轮询 | `server/src/micronutrients.js`、`useNutritionDay` | 是 |
| 宏量写入校准 | `server/src/mealMacros.js`、`resolveMealMacrosForSave` | 是；改为保存后异步，不挡 200 |
| DeepSeek 模型 | `resolveDeepSeekModel` 已识别 `deepseek-v4-pro` | 扩展为营养任务单独走 Pro，勿全局改默认 Flash |
| 营养页餐食行 | `NutritionPage` 已有「待补全」 | 扩展为估算中 |
| 餐级配料 | `meals.micronutrients.components` | 后台仍写入；底部 UI 改展示 `items` 估算量 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 新餐 name+kcal（宏量空） | 立刻存餐；后台 Pro 填 P/F/C/糖 |
| 新餐 / 改名改热量 | 后台 Pro 估微量；日加总刷新 |
| 页面打开且有进行中任务 | 计算中标识 + 食物行状态 |

## 8. Edge cases

- 宏量后台失败：餐仍在，明细「待补全」，不挡保存
- 微量后台失败：保留旧日快照 + 错误/重试；食物行标失败
- 计算中：营养页顶部横幅 + 微量页横幅 + 食物行「估算中」；记饮食表单不干等
- 营养 Pro 开启 thinking；记热量/小狸保持 Flash 且 thinking disabled

## 9. 涉及文件 / 模块（预期）

- `server/src/routes/logs.js`（宏量改为保存后异步）
- `server/src/ai/providers/deepseekText.js`（营养路径 `deepseek-v4-pro`）
- `server/src/micronutrients.js` / `src/pages/MicronutrientsPage.tsx` / `NutritionPage.tsx` / `useNutritionDay.ts`
- `docs/architecture/api-contract.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP：**

1. 宏量保存后后台估算 + 营养页估算中
2. 营养 Pro 模型与微量计算中标识加强
3. 微量页底部食物明细
4. 文档 + verify

## 11. 测试方案

- 保存不等待宏量 AI；pending 时 UI 有标识
- Pro 仅用于营养估算单测/契约
- smoke：营养入口与微量页在有餐时仍可用

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| Pro 更慢 | 真正后台 + 明确计算中，不卡保存 |
| 全局改模型拖慢小狸/记运动 | 营养单独指定 Pro |
| 旧快照看起来像没算 | 有进行中餐时强制显示计算中，不算完不假装 ready |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status → `done` + README 索引归档

## 14. 回滚方案

- 代码 revert；模型改回 Flash
- 部署上一 dist

## 15. 是否满足最小可运行闭环

是——记餐立刻成功 → 营养/微量页看到计算中 → Pro 完成后数字和食物明细更新。

## Grill 决策摘要（已确认 shared understanding）

1. 宏量改为真正后台计算，并与微量一起改用 `deepseek-v4-pro`
2. 计算中标识：营养页顶部横幅 + 微量页加强横幅 + 底部食物行「估算中」；记饮食保存成功即离开，表单不干等
3. 营养后台 Pro **开启 thinking**
4. 记饮食/记运动点「AI 估热量」、小狸对话 **保持 Flash 且关闭 thinking**
5. 微量页底部列出当日食物明细（已估算 / 估算中 / 失败；已估算显示该餐微量元素估算量，不展示配料名）
