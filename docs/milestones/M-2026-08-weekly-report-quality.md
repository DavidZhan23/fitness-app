# Milestone: 小满周报内容质量与详情页信息架构

**Status:** done
**Branch:** `dev/huanghongli`
**Started:** 2026-08-13

## 1. 任务背景

现有用户周报主要是固定数字、模板点评和通用建议，未充分利用已有的每日运动、饮食、宏量和历史周报数据，且详情页对缺失指标和成就空日的表达会造成误解。

## 2. 目标 (Goal)

用可单测的规则引擎选择真实事实、人设和至多三条可验收建议；DeepSeek 只润色文案且任何失败都回退到规则文案。详情页以 headline、具体点评、环比、覆盖率和验收标准组织信息。

## 3. 成功标准 (Success criteria)

- [x] 洞察、建议选题和 AI 输出校验有纯函数单测。
- [x] 周报包含本周 evidence、headline、周环比、宏量覆盖和 `narrativeSource`。
- [x] 建议至多 3 条、维度不重复，每条有 why / content / successMetric / evidenceIds，旧客户端仍能读 title/content。
- [x] 详情页不伪造成就，按真实覆盖显示宏量或缺失说明，长图包含建议。
- [x] 未读到达弹窗仅在今日页的今天视图触发，设置页只保留入口和红点。
- [x] 本人可通过 `POST /weekly-reports/:id/regenerate` 重算单份周报，保留 id、已读和社区分享时间。
- [x] `npm run verify` 通过（261 个单测 + 42 个 e2e）。

## 4. Non-goals

- 不新增运动时长、体重历史、微量营养或新图表库。
- 不改开发者遥测 `server/src/weeklyReport.js`，不批量重跑历史周报。
- 不在今日页放置周报常驻入口卡，不改历史列表的导航层级。
- DeepSeek 不做分类、选题或数字计算。

## 5. 已阅读的相关文档（必填）

- [x] `.cursor/rules/*.mdc`
- [x] `docs/ai-playbook.md`
- [x] `docs/milestones/M-2026-06-user-weekly-report.md`
- [x] `docs/architecture/api-contract.md` 的用户周报契约
- [x] 任务列出的周报前后端、公式、AI provider 与测试文件

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 历史日缺口 | `server/src/metabolism.js#calculateDeficitByMode` + `server/src/calories.js#resolveProfileBmr` | 是 |
| 日期 key / 周边界 | `server/src/dateKey.js` 与既有周报日期函数 | 是 |
| kcal 归一化 | `server/src/calories.js#toKcal` | 是 |
| 宏量目标 | `src/lib/macroTargets.ts#calculateMacroTargets` | 提取单一纯规则供前后端共用 |
| DeepSeek 文本客户端 | `server/src/ai/providers/deepseekText.js` | 是，扩展严格 JSON 请求能力 |
| API 请求 | `src/lib/api/http.ts#apiFetch` / `src/lib/api/index.ts#httpData` | 是 |
| 旧快照兼容 | `server/src/userWeeklyReport.js#normalizeReportJson` / `src/lib/userWeeklyReport.ts` | 是，原地扩展 |
| 长图 | `src/lib/weeklyReportImage.ts` + `data-weekly-report-capture` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 本周 profile、day logs、exercises、含 P/F/C/S 的 meals、上一自然周快照 | 包含统计、insights、evidence、wowDelta、规则人设和建议的快照 |
| 规则文案与允许的 evidence | 可选 AI 润色文案，或规则 fallback |
| 本人周报 id | 原 id/已读/分享状态不变的新快照 |

## 8. Edge cases

- 无上周快照：所有环比 delta 为 `null`。
- 宏量覆盖少于 4/7 天：宏量结论为 insufficient，总蛋白不用 0 代替缺失。
- AI 未配置、超时、非严格 JSON、篡改/编造事实或违规文案：`console.warn` 后持久化规则文案，不阻断生成。
- 旧 JSON 缺新字段或旧建议只有 title/content：服务端和前端 normalize 补齐安全默认。
- 跨用户再生成：按 `id + user_id` 查询，统一返回 404。

## 9. 涉及文件 / 模块（预期）

- `server/src/userWeeklyReport.js`、`server/src/routes/weeklyReports.js`
- `server/src/ai/providers/deepseekText.js`、前后端共用的宏量目标规则
- `server/test/userWeeklyReport.test.js`
- `src/types/index.ts`、`src/lib/userWeeklyReport.ts`、`src/lib/api/index.ts`
- `src/pages/WeeklyReportPage.tsx`、`TodayPage.tsx`、`SettingsPage.tsx`
- `src/components/WeeklyReportArrivalSheet.tsx`、`src/index.css`
- `docs/architecture/api-contract.md`、`README.md`、`docs/milestones/README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 洞察引擎与规则建议，先补单测。
2. DeepSeek 润色、校验和 fallback。
3. 宏量、公式、环比、类型和 normalize 接入。
4. 详情页、今日页到达弹窗、再生成 API。
5. 文档与完整 verify。

**后续（不做）：**

- 历史周报批量升级，定时预生成，新的数据采集维度。

## 11. 测试方案

- 服务端纯函数：覆盖 5+ 天饮食、aggressive recovery、差异化输出、空宏量、事实 headline、AI 编造数字拒绝。
- 前端 normalize：新字段和旧建议缺字段的安全缺省。
- 定向：`npx vitest run server/test/userWeeklyReport.test.js src/lib/__tests__/userWeeklyReport.test.ts`。
- 完整：`npm run verify`。
- **拟人探查结论（`self-today` 为主，`new-empty` 为辅）：**本地 Vite `http://127.0.0.1:5173`，360×800 窄屏。未登录直达 `/weekly-reports/:id` 正确回到 `/login`，页面无 console error/warn；由于本轮浏览器无已登录会话且本地 API 未运行，未实际点击今日未读弹窗、设置红点、详情长图。这些交互以类型/构建/单测与完整 verify 补充验证。
- **拟沉淀 e2e：**`e2e/user-weekly-report-arrival.spec.ts`：为已 onboarding 用户预置未读周报 → 进入历史日不弹 → 回今天显示 headline → 稍后关闭不写已读 → 同一页重渲染不重弹 → 重新进入今日页可再弹。`e2e/user-weekly-report-detail.spec.ts`：预置含宏量/环比/evidence 的快照 → 断言 headline、点评前置、动/食标记、P/F/C、空成就“未点亮”、三段建议，并确认 `[data-weekly-report-capture]` 内含 NEXT WEEK。

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| AI 修改事实或生成安全性不合格文案 | 模型只返文案字段，服务端校验数字、evidence、实体名、长度和禁词，失败回退规则 |
| 旧快照结构不一致 | 前后端 normalize 为新字段提供可渲染默认值 |
| 旧字段 `estimatedTdeeTotal` 语义错误 | 新快照使用明确的基础代谢字段，旧字段仅作兼容不再用于文案 |
| 再生成破坏已读/分享状态 | 只更新 `report_json` 与 `updated_at`，不更改状态列 |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert PR。
- DB：本轮只扩展 JSON 形状，无 schema 迁移。
- 部署：回退上一个 release 的 `dist` 和 API 镜像。

## 15. 是否满足最小可运行闭环

是——用户进入今日页发现未读周报，查看真实洞察与可验收建议，也能对本人单份周报再生成。
