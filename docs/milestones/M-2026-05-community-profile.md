# Milestone: 社区资料与当日可见

**Status:** active  
**Branch:** `feat/community-profile-birthday`  
**PR:** #54  
**Started:** 2026-05-26

## 1. 任务背景

社区与设置需要：用生日替代仅填年龄、支持当日动态单独公开/隐藏、设置页自动保存，并统一运动/饮食热量展示文案。

## 2. 目标 (Goal)

用户可在引导与设置中维护生日；在社区顶栏切换「今日公开/隐藏」；他人看到隐藏态提示；列表与详情页热量文案一致。

## 3. 成功标准 (Success criteria)

- [x] `profiles.birthday` + 引导/onboarding 使用生日，服务端反算 `age`
- [x] `PATCH /community/days/:date/visible` 仅本人可改当日可见
- [x] 社区顶栏「今日公开/隐藏」；切换「全部/关注」状态一致
- [x] 自己名片右上角显示热量缺口；他人隐藏时见「今日已隐藏」
- [x] 设置页身体资料防抖自动保存（含生日时区规范化）
- [x] `api-contract.md` / `overview.md` / README 已同步

## 4. Non-goals

- 不改 `profiles.community_visible` 自动同步规则（仍由近日是否有记录决定）
- 不在设置页恢复全局「社区公开」手动开关（已移除顶栏「已公开」徽章）

## 5. 已阅读的相关文档

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md`
- [x] `.cursor/rules/06-reuse-first.mdc`

## 6. 可复用模块

| 想做的事 | 已有实现 |
|----------|----------|
| 生日 / 年龄 | `src/lib/birthday.ts`，`server/src/profilePatch.js` |
| 社区缺口 | `src/lib/communityDeficit.ts` |
| 列表缓存按 tab | `src/lib/communityListCache.ts` |
| 日可见 API | `server/src/community.js#setDayLogCommunityVisible` |

## 9. 涉及文件（摘要）

- 迁移：`015_profile_birthday.sql`，`016_day_logs_visible.sql`，`server/src/db.js#runMigrations`
- 前端：`SettingsPage`，`OnboardingPage`，`CommunityPage`，`CommunityMemberCard`，`DayCommunityVisibleToggle`
- 文档：`api-contract.md`，`overview.md`，本文件

## 11. 测试方案

- `npm run lint && npm run typecheck && npm run test`
- 手动：新用户 onboarding 填生日；设置改生日不漂移；社区顶栏隐藏后另一账号见「今日已隐藏」
- 迁移后重启 API

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| `date` 存 PG 返回 ISO 导致生日 -1 天 | `normalizeBirthdayFromApi` 按本地日历格式化 |
| 全部/关注 tab 缓存不一致 | `syncSelfDayVisibleInCommunityListCache` + 独立 `selfDayVisible` 状态 |
