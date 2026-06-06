# Milestone: 基础代谢计入方式偏好

**Status:** done
**Branch:** `main`
**Started:** 2026-06-06

## 1. 任务背景

当前今日缺口固定按时间逐分钟累计基础代谢。用户希望可在设置中切换为当天开始后立即计入全天基础代谢，并将全天计入作为默认模式。

## 2. 目标 (Goal)

新增「全天计入 / 随时间累计」两种基础代谢计入方式，保存到用户 Profile，并让今日、日历和社区今日数据统一遵循卡片主人的选择。

## 3. 成功标准 (Success criteria)

- [x] Profile 新增 `metabolism_mode`，默认 `full_day`
- [x] 设置页提供「全天计入 / 随时间累计」两张选择卡并即时保存
- [x] 今日页主卡和今日打卡墙遵循当前用户模式
- [x] 社区今日卡片遵循卡片主人模式
- [x] 历史日期始终按全天基础代谢计算
- [x] API、前后端计算和测试同步更新

## 4. Non-goals

- 不修改 BMR 公式、活动系数、运动或饮食数据
- 不追溯重写已保存的历史日志
- 不将该偏好公开为社区成员资料字段

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-06-metabolism-mode.md` 自身
- [x] `docs/milestones/M-2026-05-today-page-layers.md`
- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md`（无新表，仅 Profile 字段）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 分钟累计代谢 | `src/lib/metabolism.ts`、`server/src/metabolism.js` | 是，扩展模式入口 |
| Profile 保存 | `AuthContext#updateProfile`、`profilePayload.ts`、`profilePatch.js` | 是 |
| 设置选择卡 | `SettingsPage` 打卡墙样式选择卡 | 是，沿用交互模式并优化视觉 |
| 今日/日历/社区缺口 | `calculateSpreadDeficit` 及现有调用点 | 是，显式传入模式 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| Profile `metabolism_mode` | 今日基础代谢计入量与实时缺口 |
| 历史日期 | 始终计入全天基础代谢 |

## 8. Edge cases

- 新用户、旧用户或缺失字段：默认 `full_day`
- 未来日期：基础代谢计入 0
- 当天午夜：`full_day` 立即计入全天；`time_spread` 从 0 开始累计
- 切换保存失败：设置 UI 回滚到已保存模式
- 社区他人卡片：使用卡片主人的模式，不使用浏览者模式

## 9. 涉及文件 / 模块（预期）

- `server/migrations/028_profile_metabolism_mode.sql`
- `server/src/db.js`、`server/src/profilePatch.js`、`server/src/metabolism.js`、`server/src/community.js`
- `src/types/index.ts`、`src/lib/metabolism.ts`、`src/lib/profilePayload.ts`
- `src/pages/TodayPage.tsx`、`src/pages/CalendarPage.tsx`、`src/pages/CommunityUserPage.tsx`
- `src/lib/monthData.ts`、`src/lib/communityDeficit.ts`
- `src/pages/SettingsPage.tsx`、`src/index.css`
- `docs/architecture/api-contract.md`、`README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 增加 Profile 字段、API 清洗与前端类型
2. 扩展共享代谢计算并统一调用点
3. 增加设置页选择卡和保存反馈
4. 更新文档、单测与响应式 E2E

**后续（不做）：**

- 提供按小时、睡眠时间或自定义起始时间的更多模式

## 11. 测试方案

- 前后端 metabolism 单测
- Profile Patch 单测
- `npm run typecheck`
- `npm run build`
- `npm run check:today-responsive`
- `npm run check:site-responsive`

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 今日页、日历和社区数值不一致 | 所有实时缺口显式传递 Profile/快照模式 |
| 旧 Profile 无字段 | DB 与前后端解析均默认 `full_day` |
| 切换后社区缓存显示旧值 | Profile 更新后沿用页面重新计算/重新获取机制；今日自卡优先 Profile |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md`
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status 改 `done`
- [x] `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：回退模式计算和设置 UI；数据库字段可保留，旧代码会忽略。

## 15. 是否满足最小可运行闭环

是——用户可在设置中切换并立即看到今日缺口按所选方式重新计算。
