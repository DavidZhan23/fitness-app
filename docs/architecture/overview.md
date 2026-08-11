# 架构总览

> 导航：[文档中心](../README.md) · [API 契约](api-contract.md) · [部署说明](deploy.md)

## 读这个就够（TL;DR）

- **主轴：** **本人当日热量账本**——注册登录 → 身体资料（BMR/TDEE）→ 记运动/饮食 → 当日缺口 → 打卡墙。社区与 AI 是挂在日账本上的增强，不与记账平级。
- **用户边界：** 熟人小圈子（`REGISTRATION_KEY` 门禁）；社区不做陌生人发现 / 推荐 / 公开放大。
- **栈：** Vite/React PWA（`src/`）→ Express（`server/src/`）→ PostgreSQL；生产 Nginx → API :3001。
- **「一天」勿混用：** 记账 / 今日页 / 墙用**浏览器本地日历日**；配额 / 周报 / 狐狸周等用 **`DISPLAY_TIMEZONE`（默认 Asia/Shanghai）**。见 [ADR-0004](../decisions/0004-date-tz-strategy.md)。
- **热量公式：** 目标为共享包一份源码（`packages/calories`，含 metabolism）；搬迁见 [ADR-0008](../decisions/0008-shared-calories-package.md)。搬迁前仍双端文件，改公式须两端一起改。
- **改契约：** [api-contract.md](api-contract.md) 文首 TL;DR；schema 只加 `server/migrations/NNN_*.sql`。
- **协作：** [ai-playbook.md](../ai-playbook.md)（grill → 实现 → 拟人 → verify → `dev/huanghongli` PR）。

## 1. 系统与主流程

- **生产**：PWA → 腾讯云 Nginx :80 → Node API :3001 → PostgreSQL  
- **本地**：Vite :5173 → `server npm run dev` → 本机 PostgreSQL  

主流程：注册/登录 → 身体资料 → 记录运动/饮食 → 当日缺口 → 打卡墙 →（可选）社区。

协作简图见 [ai-playbook.md](../ai-playbook.md)；流程图 SVG：`docs/assets/diagrams/`。

## 2. 数据模型（账本主轴）

完整 DDL：`server/migrations/`（按文件名顺序）。

| 表名 | 说明 | 主要外键 |
|------|------|---------|
| `users` | 账号（email + password_hash） | — |
| `password_reset_tokens` | 密码找回 token | `user_id → users.id` |
| `profiles` | 身体指标、`wall_style`、`metabolism_mode`、账号主题/联名开关、社区总开关与开发者隐藏锁 | `id → users.id` |
| `day_logs` | 每日汇总；`community_visible` 控制当日是否对他人公开 | `user_id → users.id` |
| `exercises` / `meals` | 单条运动 / 饮食；`meals` 含 nullable `protein_g/fat_g/carbs_g/sugar_g` 与 `macros_source(user\|ai)` | `day_log_id → day_logs.id` |
| `exercise_templates` / `meal_templates` | 快捷模板 | `user_id → users.id` |

## 3. 卫星能力（点到为止）

| 能力 | 要点 | 深读 |
|------|------|------|
| **社区** | follows / likes / comments / reactions；列表需 `community_visible` + onboarding；可见性规则见下 | [api-contract 社区节](api-contract.md) |
| **AI** | 文本/拍照估 kcal 与 meal 宏量、按需营养建议、狐狸陪伴；配额按上海日历日 | [api-contract AI 节](api-contract.md) |
| **遥测** | `telemetry_events` 轻量埋点 | [api-contract 遥测节](api-contract.md) |
| **周报** | 质量周报 + 用户周报快照 | [api-contract 周报节](api-contract.md) |

相关表（摘要）：`follows`、`day_likes`、`day_comments`、`day_comment_likes`、`community_member_order`、`log_item_reactions`、`telemetry_events`、`weekly_reports`、`user_weekly_reports`。

### 3.1 社区可见性（摘要）

- **列表候选：** `profiles.community_visible` 且 `onboarding_complete`（`community.js#listCommunityMembers`）。
- **近日自动打开：** 今/昨有记录 → 总开关 auto-open，不 auto-close（`communityVisibility.js`，日记录变更后触发）；`community_visible_locked_by_developer=true` 时永不 auto-open。
- **开发者隐藏：** developer visibility PATCH 在隐藏时同时加锁，重新展示时解锁；历史 `023` backfill 只允许作为一次性 SQL migration，启动兼容 DDL 禁止重复数据回填。
- **用户开关：** 未锁定时可自行开关总公开；开发者锁定时 Profile API 拒绝该字段并返回 409，前端显示管理员隐藏提示。
- **存量升级：** 旧 Schema 没有记录“谁执行了隐藏”，不能安全区分用户自隐藏与开发者隐藏；升级后需由开发者对历史管理员隐藏账号重新执行一次“隐藏”以建立锁，不能批量锁定所有 `community_visible=false` 账号。
- **当日隐藏：** `day_logs.community_visible` + `PATCH /community/days/:date/visible`（仅本人）。

## 更多

- 部署：[deploy.md](deploy.md) · 运维：[ops/README.md](../ops/README.md)  
- 决策：[decisions/README.md](../decisions/README.md)  
- 迁移：新 `NNN_*.sql`；API 启动执行未应用 migration（`schema_migrations`）
