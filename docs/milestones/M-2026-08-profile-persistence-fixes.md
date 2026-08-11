# Milestone: 主题与社区可见性持久化修复

**Status:** done
**Branch:** `dev/huanghongli`
**Started:** 2026-08-11

## 1. 任务背景

两个已定位的持久化缺陷：主题只依赖 Cookie，部分手机清 Cookie 后丢失；开发者隐藏社区成员后，启动时历史回填和近日记录同步都会把成员重新公开。

## 2. 目标 (Goal)

- 主题和 Hero 联名开关同时持久化到 localStorage、Cookie 与登录账号 profile；账号服务端值作为跨设备真相，兼容上线前已有本地偏好迁移。
- 开发者隐藏写入独立持久锁；API 重启、打卡、打开社区和后续 migration 都不能自动解锁，只有开发者重新展示才能解除。

## 3. 成功标准

- [x] 仅保留 localStorage 或仅依赖登录 profile 时，`batman-v-superman` 均能恢复。
- [x] Onboarding 最终选择与 Hero 联名开关写入 profile。
- [x] 开发者隐藏后，启动与近日记录同步均不再恢复公开；开发者重新展示会解除锁。
- [x] 未被开发者锁定时，用户自己的社区公开开关与近日 auto-open 规则保持不变。
- [x] 单测、typecheck 与 `npm run verify` 通过，Schema/API/架构文档同步。

## 4. Non-goals / 边界

- 不新增主题或第二套主题状态机，不改变主题视觉。
- 不删除历史 `023_backfill_community_visible_onboarded.sql`；只移除启动路径中的重复数据回填。
- 不修改与两项持久化问题无关的营养、AI、响应式或样式改动。

## 5. 已阅读的相关文档

- [x] `AGENTS.md`、`.cursor/rules/*.mdc`、`docs/ai-playbook.md`
- [x] `docs/milestones/M-2026-08-batman-v-superman-theme.md`
- [x] `docs/architecture/api-contract.md`、`docs/architecture/overview.md`
- [x] `StyleContext.tsx`、`profilePatch.js`、`db.js#runMigrations`
- [x] `communityVisibility.js`、`developerCommunity.js`、`DeveloperCommunityPage.tsx`
- [x] `AuthContext.tsx`、`profilePayload.ts`、Onboarding 与社区开关调用链

## 6. 已检查的可复用代码

| 需求 | 复用结论 |
|------|----------|
| Profile 读写 | 复用 `httpData.getProfile/updateProfile`、`AuthContext.updateProfile`、前后端 profile payload builder |
| 主题状态 | 扩展唯一 `StyleContext`，不新增 context/状态机 |
| 浏览器持久化 | reuse 表没有主题存储模块；新增 `src/lib/themePersistence.ts`，统一且仅在该模块访问 localStorage/Cookie，并登记 reuse 表 |
| 社区自动同步 | 扩展唯一 `communityVisibility.js#syncCommunityVisibility` |
| 开发者管理 | 扩展现有 developer community GET/PATCH，不新增路由 |
| Schema | 新增顺序 migration，并在 `db.js#runMigrations()` 写等价 idempotent DDL |

## 7. 数据/API 决策

- `profiles.app_style text`：nullable 用于识别老账号尚未写入服务端；非法非空值按 `default` 自愈。
- `profiles.hero_collab jsonb`：nullable；仅接受已有联名主题键的 boolean map。
- `profiles.community_visible_locked_by_developer boolean not null default false`。
- 开发者隐藏：`visible=false + lock=true`；重新展示：`visible=true + lock=false`。
- 用户在锁定时修改总公开开关返回 409，前端禁用并解释；未锁定时维持原行为。
- 本地主题/Hero 偏好用 user id owner 同时绑定 localStorage/Cookie；账号切换不迁移上一账号数据。已登录偏好 PATCH 串行，Onboarding 预览不写服务端，最终完成请求是唯一主题写入。

## 8. 测试与回滚

- 前端纯函数：主题 normalize、本地优先级、Cookie fallback、双写。
- 后端：profile patch 主题字段、开发者锁写入/解除、锁定时近日记录不 auto-open、启动源码不再包含 023 数据回填。
- 回滚代码不会删除新增列；旧客户端会忽略新增 profile 字段。社区锁列必须保留，避免隐藏语义丢失。

### 拟人探查（2026-08-11）

- 人设：`family-viewer` / 开发者社区管理；本地 `127.0.0.1:5173`。
- 通过：未登录直达 `/settings`、`/dev/community` 均跳转登录页；页面无 console error；API 启动成功应用 033/034 migration。
- 未探：应用内浏览器没有已登录本地账号，未输入或读取用户凭据，因此管理员锁提示、用户开关禁用态与实际 PATCH 未做浏览器交互。
- 建议 e2e：新增 `e2e/community-developer-lock.spec.ts`，用开发者测试账号隐藏成员 → 成员记餐/刷新社区 → 断言仍隐藏 → 开发者重新展示 → 断言恢复；设置页另断言锁定账号显示“管理员隐藏”且 switch disabled。
- 全量验证：`npm run verify` 通过（233 unit + 39 Playwright e2e，syntax 与 raw-fetch/storage/API-contract guards 全通过）。
