# Milestone: 用户每周周报

**Status:** active
**Branch:** `main`（基于现有未提交的小狸陪伴改动继续）
**Started:** 2026-06-18

## 1. 任务背景

用户希望每周回顾上一自然周的运动、饮食、热量缺口和每日成就，并由小狸给出温柔总结与具体建议；报告需要可重复查看、可分享，并在今日页提示未读状态。

## 2. 目标 (Goal)

提供服务端持久化、幂等懒生成的个人周报闭环：今日页发现与提示、周报详情、历史列表、已读状态和设置入口。

## 3. 成功标准 (Success criteria)

- [x] 进入今日页时能幂等生成上一周报告，同一用户同一周仅一份。
- [x] 未读报告主动提示，查看后不再重复弹出，今日页仍可再次进入。
- [x] 详情页展示 7 天缺口、运动、饮食、成就、小狸点评和至多 3 条建议。
- [x] 设置页可进入历史周报列表；空数据、断网和字段缺失不白屏。
- [ ] 核心统计函数有单元测试，项目 typecheck/build/test 通过。

## 4. Non-goals

- 不新增运动时长录入、三大营养素录入或体重历史模型；无源数据明确显示暂无统计。
- 不新增独立 achievement records 表；每日成就按既有规则计算并固化进周报快照。
- 不引入截图第三方依赖；分享优先使用 Web Share API，回退复制摘要。
- 不接入新的 AI 调用；本期使用确定性 fallback 文案，避免周报生成依赖外部服务。

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-06-user-weekly-report.md` 自身
- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md`
- [x] `docs/ai-playbook.md`
- [x] `AGENTS.md`

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 历史日缺口 | `server/src/metabolism.js`、`src/lib/monthData.ts` | 是 |
| BMR 与 kcal 归一化 | `server/src/calories.js` | 是 |
| 日期 key | `server/src/dateKey.js`、`src/lib/streaks.ts` | 是 |
| 每日成就 | `server/src/communityBadges.js`、`src/lib/todayHonors.ts` | 是 |
| 小狸形象 | `src/assets/daji-fox-companion-cutout.webp` | 是 |
| API 请求 | `src/lib/api/http.ts`、`src/lib/api/index.ts` | 是 |
| 响应式页面容器 | `src/components/ui/responsive/PageShell.tsx` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 上一自然周 `day_logs`、`exercises`、`meals`、当前 profile | 固化的 `WeeklyReport` JSON 快照 |
| 今日页 ensure 请求 | 最新上一周报告及是否新生成 |
| 报告 id | 详情、已读状态、分享摘要 |

## 8. Edge cases

- 无任何有效记录：生成 `insufficient` 简版报告，不伪造指标。
- 无饮食：历史日不计基础代谢缺口，沿用月历规则。
- 无 BMR：缺口状态为 `unknown`，仍展示摄入与运动。
- 重复请求：数据库唯一键 `(user_id, week_start_date)` 幂等。
- 跨用户：所有查询同时限定 `id` 与 `user_id`。
- 时区：本期沿用项目 `DISPLAY_TIMEZONE`，默认 `Asia/Shanghai`。
- 旧版本：迁移后表为空，首次进入今日页自动生成上一周快照。

## 9. 涉及文件 / 模块（预期）

- `server/migrations/029_user_weekly_reports.sql`
- `server/src/userWeeklyReport.js`
- `server/src/routes/weeklyReports.js`
- `server/src/db.js`、`server/src/index.js`
- `src/types/index.ts`、`src/lib/api/index.ts`
- `src/pages/WeeklyReportPage.tsx`、`src/pages/WeeklyReportsPage.tsx`
- `src/components/WeeklyReportEntryCard.tsx`、`src/components/WeeklyReportArrivalSheet.tsx`
- `src/pages/TodayPage.tsx`、`src/pages/SettingsPage.tsx`、`src/App.tsx`、`src/index.css`
- `docs/architecture/api-contract.md`、`docs/architecture/overview.md`、`README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 建表并实现纯统计、点评、建议与幂等生成。
2. 提供 ensure/list/detail/mark-viewed API。
3. 实现今日页弹窗与入口、详情、历史列表、设置入口和分享回退。
4. 补测试、文档和响应式验证。

**后续（不做）：**

- 运动时长、宏量营养素和体重趋势的源数据采集。
- 服务端定时批量生成与 AI 个性化点评。
- 服务端生成分享图片并保存相册。

## 11. 测试方案

- 纯函数：周边界、空数据、聚合、缺口状态、成就、点评与建议。
- API：鉴权、跨用户、幂等和已读更新通过路由/查询约束检查。
- 前端：`npm run typecheck`、`npm test`、`npm run build`。
- 响应式：`npm run check:today-responsive`、`npm run check:site-responsive`（本地 DB 可用时）。
- 完整门禁：`npm run verify`。

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 现有开发者 `weekly_reports` 同名 | 使用独立 `user_weekly_reports` 表与 `/weekly-reports` API |
| 当前资料变化影响历史计算 | 生成时固化完整 JSON 快照 |
| 无时长/营养素源字段 | 类型允许 `null`，UI 明示暂无数据 |
| 今日页已有未提交小狸改动 | 增量接入，不回退或覆盖现有代码 |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md`
- [x] 根 `README.md`
- [ ] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert 对应变更。
- DB：保留新增表不会影响旧功能；需要彻底回滚时另加迁移删除 `user_weekly_reports`。
- 部署：回退到上一个 release 的 `dist` 与 API 镜像。

## 15. 是否满足最小可运行闭环

是——登录用户进入今日页可生成、发现、查看并再次从历史列表打开报告。
