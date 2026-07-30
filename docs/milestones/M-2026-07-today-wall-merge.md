# Milestone: 今日页并入打卡墙（去打卡 Tab）

**Status:** active
**Branch:** `feat/today-wall-merge`
**Issue:** —
**Started:** 2026-07-28

## 1. 任务背景

底部「打卡」与「今日」形成双入口：打卡墙在 CalendarPage，个人当日详情在 TodayPage，自己的社区主页又是第三条路径。用户希望今日页成为自己的个人主页（上方选日详情可编辑，下方打卡墙），底栏只留「今日 / 社区」；他人主页保持只读。

## 2. 目标 (Goal)

今日页成为「自己的个人主页」：`?date=` 驱动选中日的今日式可编辑内容，记录区下方为打卡墙；点墙选日切换上方详情。底部只保留「今日 / 社区」。他人主页仍用 CommunityUserPage 只读逻辑；自己访问社区主页 redirect 到 `/?date=`。

## 3. 成功标准 (Success criteria)

- [ ] 底栏仅「今日 / 社区」，无「打卡」Tab
- [ ] 今日页记录下方可见打卡墙（连续天数、月切换、MonthHeatmap/SplitMonthWall、日详情条）
- [ ] URL `?date=` 驱动 viewDate；非法 / 未来 / 账号前日期回退今天
- [ ] 点墙格子打开 detail panel；「进入当日记录」→ `/?date=`、关 panel、滚到顶部
- [ ] 仅 viewDate === today 显示狐狸、TodayFeedbackCard、实时代谢 tick；历史日全日代谢 +「回到今天」
- [ ] 自己当日详情下挂 DayCommentSection
- [ ] 非今天可经 `/log/exercise?date=` / `/log/meal?date=` 补记，保存后回 `/?date=`
- [ ] `/calendar` redirect 到 `/`；自社区主页 `isSelf` → `/?date=`
- [ ] e2e smoke / mobile-layout / site-responsive 通过；`npm run verify` 通过

## 4. Non-goals

- 不改他人社区主页交互与隐私
- 不重做墙视觉 / `wall_style` 设置（设置页入口保留）
- 不把周报、模板并入今日
- 不做「历史日狐狸」
- 不改 API / Schema

## 5. 已阅读的相关文档（必填）

> plan 冻结前必须勾完，否则不算完整 plan。

- [x] `docs/milestones/M-2026-07-today-wall-merge.md` 自身
- [ ] `docs/architecture/api-contract.md`（若动 API）— 本次不改 API
- [ ] `docs/architecture/overview.md` ER 节（若动表）— 本次不改表
- [x] 其它：plan `today_wall_merge_8c023ee8.plan.md`；`06-reuse-first.mdc`

## 6. 已检查的可复用代码（必填，避免造轮子）

> 在 `src/lib/` 与 `server/src/` 用关键词 grep，命中就复用，不新写。
> 参考清单：见 `.cursor/rules/06-reuse-first.mdc`。

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 月墙 / 分屏墙 | `MonthHeatmap`, `SplitMonthWall` | 是 |
| 日详情条 | `CalendarDayDetailPanel` | 是 |
| 月数据 | `buildMonthDayMap`, `monthCalendar.ts` | 是 |
| 日记录 CRUD | `dayLogService` | 是 |
| `?date=` 解析 | `resolveDateFromSearchParams` (`communityInboxNav.ts`) | 是 |
| 评论 | `DayCommentSection` + 现有 community comments API | 是 |
| 代谢 / 缺口 | `calories.ts`, `metabolism.ts` | 是 |
| 日期 key | `streaks.ts#formatDateKey` 等 | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| URL `?date=YYYY-MM-DD` | 今日页 viewDate 与当日 log / 墙选中态 |
| 墙格子点击 | CalendarDayDetailPanel；「进入当日记录」→ `/?date=` |
| `/log/*?date=` | 写入对应 log_date，回 `/?date=` |
| 访问 `/calendar` 或 `/community/:self` | redirect `/` 或 `/?date=` |

## 8. Edge cases

- 非法 / 未来 / 早于账号起始的 date → 回退今天
- 空日 log：仍可显示缺口卡（代谢）与补记入口
- 断网：沿用现有 dayLogService / apiFetch 错误提示
- 跨日：午夜后 today 变化，URL 无 date 时自然跟今天
- 自己 vs 他人：仅自己走 Today 可编辑；他人 CommunityUserPage 只读不变

## 9. 涉及文件 / 模块（预期）

- `src/pages/TodayPage.tsx`
- `src/pages/LogPage.tsx` / `src/features/log/submitLog.ts`
- `src/components/Layout.tsx` / `src/App.tsx`
- `src/pages/CommunityUserPage.tsx`
- `src/components/WeeklyReportSharePanel.tsx`
- 删除或清空 `src/pages/CalendarPage.tsx`
- `docs/milestones/*`、根 `README.md`
- `e2e/smoke.spec.ts`、`e2e/mobile-layout.spec.ts`、`e2e/site-responsive.spec.ts`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. milestone + `feat/today-wall-merge`
2. TodayPage：`viewDate` + 迁入墙 + 选日 + 狐狸仅今天 + DayCommentSection
3. Log 支持 `?date=` 补记
4. 去打卡 Tab、`/calendar` redirect、自社区页 redirect
5. README + e2e；`npm run verify`

**后续（不做）：**

- 周报 / 模板并入今日
- 墙视觉重做
- hash 锚点滚到墙（MVP 周报链接只到 `/`）

## 11. 测试方案

- Smoke / e2e：底栏两 Tab；今日页可见打卡墙；无「打卡」Tab
- `npm run verify`（含 lint / typecheck / unit / e2e / server syntax / rule guards）
- 手动：选历史日 → 补记运动/饮食 → 回 `/?date=`；自己点社区头像应进今日页

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 今日页变长、首屏变慢 | 墙数据按月懒加载；历史日不拉狐狸 |
| 补记漏改 date 写到今天 | LogPage/submitLog 校验 + 聚焦手测 + smoke |
| 旧 `/calendar` 外链 | redirect 保留 |

## 13. 文档同步计划（合并前必须完成）

- [ ] `docs/architecture/api-contract.md`（若动 API）— N/A
- [ ] `docs/architecture/overview.md` ER 节（若动表）— N/A
- [ ] `docs/architecture/deploy.md`（若动交付/部署流程）— N/A
- [x] 根 `README.md`「功能」一节（若用户可见的新功能或行为变更）
- [ ] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert PR
- DB：无需 down migration
- 部署：上一个 release 的 `dist` symlink 路径

## 15. 是否满足最小可运行闭环

是——用户可在今日页查看/编辑任意可选日、用墙切日、补记历史日，并仅用两 Tab 在今日与社区间切换。
