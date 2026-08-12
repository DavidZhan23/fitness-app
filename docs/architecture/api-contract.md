# API 契约

> 导航：[文档中心](../README.md) · [架构总览](overview.md)

## 读这个就够（TL;DR）

- **Base：** 本地 `http://localhost:3001`；生产经 Nginx `/api`（`VITE_API_URL` 带前缀）。
- **鉴权：** 除 register/login/password-reset/health 外，`Authorization: Bearer <jwt>`。注册需 `REGISTRATION_KEY`（熟人圈子门禁）。
- **常改面：** `/profile`、`/day-logs*`（打卡账本主轴）、`/ai/*`、`/community/*`、`/telemetry`、周报相关。
- **日期：** 记账日键多为客户端本地日；配额/周报/狐狸周等服务端逻辑用 `DISPLAY_TIMEZONE`（默认 Asia/Shanghai）——见 [overview](overview.md) / [ADR-0004](../decisions/0004-date-tz-strategy.md)。
- **约定：** 热量字段 `kcal`；列表/详情变更须同步本文 + `src/lib/api/`。
- **协作：** 动 API 先更新本文件；闭环见 [ai-playbook.md](../ai-playbook.md)。

Base URL：

- 本地：`http://localhost:3001`
- 生产（Nginx 反代）：`http://<HOST>/api`（前端 `VITE_API_URL` 指向带 `/api` 前缀）

认证：除注册、登录、密码找回、health 外，Header `Authorization: Bearer <jwt>`。

## 公共

| Method | Path | 说明 |
|--------|------|------|
| GET | `/health` | `{ ok, aiConfigured }` |

## 认证

| Method | Path | Body | 说明 |
|--------|------|------|------|
| POST | `/auth/register` | email, password, registration_key | 注册（`registration_key` 须与服务端 `REGISTRATION_KEY` env 一致） |
| POST | `/auth/login` | email, password | 登录 |
| POST | `/auth/password-reset/request` | email | 请求密码重置邮件；无论邮箱是否存在均返回 `{ ok, message }`，避免账号枚举 |
| POST | `/auth/password-reset/confirm` | token, password | 使用邮件链接中的一次性 token 设置新密码；密码至少 6 位 |
| GET | `/auth/me` | — | 当前用户；响应 `user.isDeveloper`（由 `DEVELOPER_EMAILS` / `ADMIN_EMAILS` 判定） |

密码找回配置：`PASSWORD_RESET_BASE_URL` 决定邮件链接根地址；生产需配置 `SMTP_HOST`、`SMTP_FROM`，可选 `SMTP_PORT`、`SMTP_SECURE`、`SMTP_STARTTLS`、`SMTP_USER`、`SMTP_PASS`。开发环境未配置 SMTP 时，API 会把重置链接打印到日志。

## 资料

| Method | Path | 说明 |
|--------|------|------|
| GET | `/profile` | 读取资料；含账号主题 `app_style`、联名开关 `hero_collab`，以及只读的 `community_visible_locked_by_developer` |
| PATCH | `/profile` | 更新资料（BMR/TDEE 等）；支持 `birthday`（`YYYY-MM-DD`，不可为未来日期）。若传 `birthday`，服务端按 Asia/Shanghai 今日反算 `age` 并写入（优先于请求体中的 `age`）。支持 `wall_style`：`classic`（默认，同页双热力图）或 `split`（运动墙/代谢墙分屏切换）；`metabolism_mode`：`full_day` 或 `time_spread`；`avatar_url`：`data:image/(jpeg\|png\|webp);base64,...`（≤120KB），传 `null` 清除；`app_style`：当前 `AppStyle` 白名单（非法值归一为 `default`）；`hero_collab`：已有联名主题键的 boolean map。开发者隐藏锁定期间若提交 `community_visible`，返回 409，其他资料仍可正常修改 |

## AI

| Method | Path | 说明 |
|--------|------|------|
| GET | `/ai/meal-photo-quota` | 饮食拍照识别当日额度。响应 `{ limit, used, remaining, unlimited, dateKey }`；`remaining` 在开发者无限额时为 `null`；`unlimited: true` 表示不受 30 次/日限制 |
| POST | `/ai/estimate-kcal` | AI 估算千卡。文本：`{ type: 'exercise'\|'meal', description: string }`。拍照（仅 meal）：`{ type: 'meal', modality: 'image', image: 'data:image/jpeg;base64,...', description?: string }`。拍照成功响应可含 **`mealPhotoQuota`**；超额返回 **429** 且带 `mealPhotoQuota`。`type: 'exercise'` 时服务端 prompt 要求仅估**运动增量消耗**；`meal` 为饮食摄入。响应 **`kcal` 必填**；有合法拆分项时附带 **`items`**（同下） |
| POST | `/ai/macro-advice` | 用户主动点营养页「重新评估」时调用。Body `{ actual: {protein_g,fat_g,carbs_g,sugar_g}, targets: 同形 }`；响应 `{ advice, targets }`。AI 只可将 P/F/C 在规则目标 ±15% 内微调，添加糖保持所选的 50/25/15g 参考值；营养页默认打开不调用 |
| GET | `/ai/fox-companion` | 今日页狐狸陪伴资格。仅狐狸逻辑按 Asia/Shanghai 周六到周五作为一周，只检查本周六到今天：历史日期按全天结算并固定解锁，今天按当前记录实时结算，若今天吃多后不再是运动大王且没有历史命中，小狸会消失；其他周统计仍按各自原规则。响应 `{ eligible, today, weekStart, weekEnd, todayChampion, historicalChampionDates, championDates, latestChampionDate? }` |
| POST | `/ai/fox-encouragement` | 小狸结构化对话；仅当前用户狐狸周达成过运动大王时可用。Body 为 `{ trigger, user?: { displayName?, locale? }, fitness, context: { timeOfDay, page: 'today', appLanguage? } }`，服务端只保留白名单运动上下文。响应 `{ text, mood, motion, expression, bubbleStyle, duration, fallback }`；枚举/文本/时长均经服务端校验，AI 未配置、超时、非法 JSON 或限频时返回同形本地 fallback，不暴露 DeepSeek 密钥或错误细节 |
| （同上 items 格式） | | `[{ name, quantity, unit, kcal, protein_g?, fat_g?, carbs_g?, sugar_g?, confidence?, reason? }]`；**`items[].kcal` = 该 `unit` 的单位热量**（可为小数）；meal 四项同样是该 `unit` 的单位克数。`sugar_g` 专指制作/烹饪/加工时加入的添加糖（按游离糖口径纳入蜂蜜、糖浆、果汁浓缩物），不包括完整水果、牛奶中天然糖；无法从配料区分时应省略，不把「总糖」直接填入。顶层 **`kcal` = Σ round(quantity × 单位热量)** |

拍照识别配额：普通用户 **30 次/人/日**（Asia/Shanghai 日历日）；`DEVELOPER_EMAILS` 白名单用户不限次、不计数。

## 遥测（轻量埋点）

| Method | Path | Body | 说明 |
|--------|------|------|------|
| POST | `/telemetry/events` | `{ events: [{ name, route?, durationMs?, metadata?, clientAt?, sessionId?, appVersion?, commitSha? }] }` | 批量上报前端交互事件（最多 20 条/次）；需登录 |

事件名白名单（6 个，本期收紧）：
`page_load`、`route_change`、`ai_estimate_success`、`ai_estimate_timeout`、`ai_estimate_error`、`ai_estimate_fallback_complete`。

`metadata` 字段白名单：`input_length`、`input_mode`、`route_from`、`route_to`、`duration_ms`、`status`、`error_type`、`kind`。前后端双侧 pick，其他字段静默丢弃。**禁止**记录饮食原文、体重、身体数据等 PII。

详见 [`docs/metrics/frontend-metrics-design.md`](../metrics/frontend-metrics-design.md)。

### 遥测周报（开发者 only）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/telemetry/weekly-reports` | 列表（最近 52 周，不含 `report_md`）；需开发者 |
| GET | `/telemetry/weekly-reports/:week` | 详情（含完整 `report_md`）；week 格式 `YYYY-Www` |
| POST | `/telemetry/weekly-reports/:week/regenerate` | 强制重新生成指定周报；需开发者 |

**开发者鉴权**：`DEVELOPER_EMAILS`（优先）或 `ADMIN_EMAILS`（回退），逗号分隔；`requireDeveloper` middleware 比对 `req.userEmail`。App 内入口：设置页「开发者后台」（仅 `isDeveloper` 为 true 时显示）。

### 社区名片可见性（开发者 only）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/developer/community-members` | 全部注册用户及 `communityVisible`、`communityVisibleLockedByDeveloper` 状态；需开发者 |
| PATCH | `/developer/community-members/:userId/visibility` | Body: `{ community_visible: boolean }`；`false` 会隐藏并加开发者锁，API 重启、近日打卡与社区同步都不得自动恢复；`true` 会重新展示并解除锁 |

详见 [`docs/reports/weekly/README.md`](../reports/weekly/README.md)。

## 日记录

| Method | Path | 说明 |
|--------|------|------|
| GET | `/day-logs/range` | 日期范围查询 |
| GET | `/day-logs/:date` | 单日详情；`dayLog` 含整日微量快照字段 `micronutrient_status/fingerprint/summary/updated_at/error`。有餐但从未生成快照时会异步懒算并返回 `pending`；无餐保持 `idle`，不调用 AI |
| POST | `/day-logs/ensure` | 确保当日 log 存在 |
| POST | `/day-logs/:date/micronutrients/refresh` | 本人手动重试该日整日微量快照。无餐返回 `idle`；有餐立即返回 `pending`，AI 在后台执行。成功 summary 固定补齐 16 项三态，失败保留旧 summary 且不写新成功指纹 |
| POST | `/exercises` | 添加运动 |
| PATCH/DELETE | `/exercises/:id` | 更新/删除运动 |
| POST | `/meals` | 添加饮食；body 必填 `day_log_id,name,kcal`，可选 `batch_id` 及 `protein_g/fat_g/carbs_g/sugar_g`（nullable numeric）、`macros_source`（`user\|ai`）。四项全空时保存端尝试 AI 补全；部分填写时只补空项；AI 失败不阻断保存。新写入的 `sugar_g` 均标记 `sugar_scope=added`。保存成功后异步重算该日微量快照，不等待 AI 响应 |
| POST | `/meals/macros/backfill` | 本人旧餐食一次性后台补全。Body `{ log_date: 'YYYY-MM-DD' }`；仅处理该日 `sugar_scope is null` 的 meal。旧 AI 糖值不直接沿用，而是按添加糖口径重新估算；旧手填糖保留。成功或失败均落 `sugar_scope=added` 避免重复调用。响应 `{ attempted, completed }` |
| PATCH/DELETE | `/meals/:id` | 更新/删除饮食；PATCH 同样支持四项。完整 P/F/C 按 `P×4+C×4+F×9≈kcal` 缩放；`sugar_g` 是独立跟踪的添加糖，不随碳水缩放、不额外参与热量校准。`Meal` 返回宏量列、`sugar_scope`、`macros_source` 与 `batch_id`。成功后异步重算该日微量快照；纯运动变更不触发微量 AI |

微量 summary 为 `{ version: 1, items, advice? }`。`items` 固定补齐 `vit_a,vit_c,vit_d,vit_e,vit_k,vit_b1,vit_b2,vit_b6,vit_b9,vit_b12,calcium,iron,zinc,magnesium,potassium,iodine`；每项状态仅为 `adequate|low|unknown`，low 可含 1–3 个普通食物建议。结果是可能性估算，不返回精确 mg/µg。后台写回以按 `id|name|kcal` 生成的当前餐食指纹做原子校验，过期任务不得覆盖新餐结果。

## 模板

| Method | Path | 说明 |
|--------|------|------|
| GET | `/templates/:type` | type: `exercise` \| `meal`；返回 `id, name, unit, kcal_per_unit, default_quantity, kcal`（`kcal` 为兼容缓存） |
| POST | `/templates/:type` | body: `{ name, unit, kcalPerUnit, defaultQuantity }`；服务端写入并同步 `kcal = round(kcalPerUnit × defaultQuantity)` |
| PATCH | `/templates/:type/:id` | 同 POST body；更新模板字段并同步 `kcal` |
| DELETE | `/templates/:type/:id` | 删除模板 |
| POST | `/templates/seed` | 种子默认模板；body `{ exerciseTemplates[], mealTemplates[] }`，每项含 `name, unit, kcalPerUnit, defaultQuantity` |

## 用户周报

自然周按 `DISPLAY_TIMEZONE`（默认 `Asia/Shanghai`）的周一至周日计算。报告生成后固化统计快照；同一用户、同一 `week_start_date` 仅一份。周报本期仍未接入运动时长、宏量营养素和体重历史，对应字段返回 `null`，客户端不得从 meal 宏量列自行拼入旧周报快照。

| Method | Path | 说明 |
|--------|------|------|
| POST | `/weekly-reports/ensure-latest` | 幂等检查并懒生成上一自然周报告。响应 `{ report: UserWeeklyReport, generated: boolean }`；无记录时仍生成 `summary.dataStatus = 'insufficient'` 的简版报告 |
| GET | `/weekly-reports` | 当前用户历史周报，按周倒序，最多 104 份。响应 `{ reports: UserWeeklyReport[] }` |
| GET | `/weekly-reports/:id` | 当前用户指定周报详情；跨用户 id 返回 404 |
| PATCH | `/weekly-reports/:id/viewed` | 标记已读；首次写入 `viewedAt`，重复调用幂等 |

热量缺口仅在当天有饮食记录且用户 BMR 可计算时统计：`BMR + 运动消耗 - 摄入`。缺少任一条件时为 `null / unknown`，避免把未记录饮食误判为巨大缺口。每日成就复用社区既有规则，并固化在周报 JSON 快照中。

## 社区

| Method | Path | 说明 |
|--------|------|------|
| GET | `/community/members` | 成员列表；`?filter=all\|following`；候选为 `community_visible = true` 且 `onboarding_complete = true` 的用户（onboarding 完成时默认 `community_visible=true`，无固定条数上限，默认昵称排序）；今/昨有记录时仅对未被开发者锁定的账号 auto-open；`today` 含 `dayCommunityVisible`、`hidden`（对他人隐藏当日）及 `metabolismMode`（卡片主人的基础代谢计入方式） |
| GET | `/community/followers` | 关注我的用户列表；`{ total, followers[] }`，每项含 `id`、`nickname`、`avatarUrl`、`followedAt`、`isFollowing`（我是否已回关）、`canViewProfile` |
| PUT | `/community/member-order` | 排序 |
| PATCH | `/community/days/:date/visible` | 设置当日社区动态是否公开；body `{ visible: boolean }`；`:date` 为 `YYYY-MM-DD`，仅本人 |
| GET | `/community/users/:userId` | 用户公开页（`?date=YYYY-MM-DD` 可选，默认今日） |
| GET | `/community/users/:userId/month` | 月历；响应含 `metabolismMode`，用于按卡片主人的方式计算今日格 |
| POST/DELETE | `/community/users/:userId/follow` | 关注 |
| POST/DELETE | `/community/users/:userId/likes` | 点赞日 |
| GET | `/community/users/:userId/comments` | 评论列表；每项含 `authorAvatarUrl`（作者头像 URL，可空） |
| POST | `/community/users/:userId/comments` | body: `{ body, parentCommentId? }` | 发评论（`parentCommentId` 可选，回复时填写）；响应含 `authorAvatarUrl` |
| DELETE | `/community/comments/:commentId` | 删评论 |
| POST/DELETE | `/community/comments/:commentId/likes` | 点赞/取消点赞评论；响应 `{ likeCount, dislikeCount, viewerLiked, viewerDisliked }` |
| POST/DELETE | `/community/comments/:commentId/dislikes` | 点踩/取消点踩评论；响应同上 |
| PUT | `/community/users/:userId/log-items/:itemType/:itemId/reaction` | 条目反应（body: `{ reaction: 1 \| -1 \| 0 }`；返回 `{ thumbsUp, thumbsDown, viewerReaction }`） |
| GET | `/community/inbox/unread` | 未读摘要：`count`（全部）、`interactionCount`（赞/踩/留言/回复/评论赞踩，**实时聚合源表**）；排除 `community_inbox_reads` 中已逐条标已读项；`items[]` 含 `kind`（含 `comment_like`、`comment_dislike`、`follow` 等）；取消 reaction 后刷新即消失 |
| GET | `/community/inbox` | `?mode=unread\|history&limit&offset`；`unread` 同 unread 摘要过滤（`created_at > community_notify_seen_at` 且不在 `community_inbox_reads`）；`history` 全量；列表项字段同 unread `items` |
| POST | `/community/inbox/mark-read` | 批量标已读（更新 `community_notify_seen_at`）；互动消息页「未读」Tab「一键已读」调用 |
| POST | `/community/inbox/mark-read-item` | body: `{ inboxId: string }`（如 `comment:uuid`）；逐条标已读，写入 `community_inbox_reads`；响应 `{ ok: true }` |

## 错误

常见：`400` 参数错误，`401` 未登录，`404` 不存在，`500` 服务器错误。响应体多为 `{ error: string }`。

变更 API 时请同步更新本文档。
