# API 契约

> 导航：[文档中心](../README.md) · [架构总览](overview.md)

Base URL：

- 本地：`http://localhost:3001`
- 生产（Nginx 反代）：`http://<HOST>/api`（前端 `VITE_API_URL` 指向带 `/api` 前缀）

认证：除注册/登录/health 外，Header `Authorization: Bearer <jwt>`。

## 公共

| Method | Path | 说明 |
|--------|------|------|
| GET | `/health` | `{ ok, aiConfigured }` |

## 认证

| Method | Path | Body | 说明 |
|--------|------|------|------|
| POST | `/auth/register` | email, password, registration_key | 注册（`registration_key` 须与服务端 `REGISTRATION_KEY` env 一致） |
| POST | `/auth/login` | email, password | 登录 |
| GET | `/auth/me` | — | 当前用户；响应 `user.isDeveloper`（由 `DEVELOPER_EMAILS` / `ADMIN_EMAILS` 判定） |

## 资料

| Method | Path | 说明 |
|--------|------|------|
| GET | `/profile` | 读取资料 |
| PATCH | `/profile` | 更新资料（BMR/TDEE 等）；支持 `birthday`（`YYYY-MM-DD`，不可为未来日期）。若传 `birthday`，服务端按 Asia/Shanghai 今日反算 `age` 并写入（优先于请求体中的 `age`）。支持 `wall_style`：`classic`（默认，同页双热力图）或 `split`（运动墙/代谢墙分屏切换）。支持 `avatar_url`：`data:image/(jpeg\|png\|webp);base64,...`（≤120KB），传 `null` 清除 |

## AI

| Method | Path | 说明 |
|--------|------|------|
| POST | `/ai/estimate-kcal` | DeepSeek 估算千卡（需服务端 Key）。Body: `{ type: 'exercise'|'meal', description: string }`。`type: 'exercise'` 时服务端 prompt 要求仅估**运动增量消耗**（不含基础代谢/静息代谢）；`meal` 为饮食摄入。响应 **`kcal` 必填**；有合法拆分项时附带 **`items`**：`[{ name, quantity, unit, kcal, confidence?, reason? }]`（`confidence`: `high` \| `medium` \| `low`；`reason`: 服务端 normalize 后 ≤60 Unicode 字符的简短估算依据），此时 `kcal` 为各 item 之和；仅顶层 kcal 时返回单条 fallback item |

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

详见 [`docs/reports/weekly/README.md`](../reports/weekly/README.md)。

## 日记录

| Method | Path | 说明 |
|--------|------|------|
| GET | `/day-logs/range` | 日期范围查询 |
| GET | `/day-logs/:date` | 单日详情 |
| POST | `/day-logs/ensure` | 确保当日 log 存在 |
| POST | `/exercises` | 添加运动 |
| PATCH/DELETE | `/exercises/:id` | 更新/删除运动 |
| POST | `/meals` | 添加饮食；body 可选 `batch_id`（UUID，同批多条饮食共享，仅客户端批量保存时使用） |
| PATCH/DELETE | `/meals/:id` | 更新/删除饮食；`Meal` 含 `batch_id`（nullable） |

## 模板

| Method | Path | 说明 |
|--------|------|------|
| GET | `/templates/:type` | type: `exercise` \| `meal`；返回 `id, name, unit, kcal_per_unit, default_quantity, kcal`（`kcal` 为兼容缓存） |
| POST | `/templates/:type` | body: `{ name, unit, kcalPerUnit, defaultQuantity }`；服务端写入并同步 `kcal = round(kcalPerUnit × defaultQuantity)` |
| PATCH | `/templates/:type/:id` | 同 POST body；更新模板字段并同步 `kcal` |
| DELETE | `/templates/:type/:id` | 删除模板 |
| POST | `/templates/seed` | 种子默认模板；body `{ exerciseTemplates[], mealTemplates[] }`，每项含 `name, unit, kcalPerUnit, defaultQuantity` |

## 社区

| Method | Path | 说明 |
|--------|------|------|
| GET | `/community/members` | 成员列表；`?filter=all\|following`；候选为 `community_visible = true` 且 `onboarding_complete = true` 的用户（onboarding 完成时默认 `community_visible=true`，无固定条数上限，默认昵称排序）；`today` 含 `dayCommunityVisible`、`hidden`（对他人隐藏当日） |
| GET | `/community/followers` | 关注我的用户列表；`{ total, followers[] }`，每项含 `id`、`nickname`、`avatarUrl`、`followedAt`、`isFollowing`（我是否已回关）、`canViewProfile` |
| PUT | `/community/member-order` | 排序 |
| PATCH | `/community/days/:date/visible` | 设置当日社区动态是否公开；body `{ visible: boolean }`；`:date` 为 `YYYY-MM-DD`，仅本人 |
| GET | `/community/users/:userId` | 用户公开页（`?date=YYYY-MM-DD` 可选，默认今日） |
| GET | `/community/users/:userId/month` | 月历 |
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
| POST | `/community/inbox/mark-read` | 批量标已读（更新 `community_notify_seen_at`；前端列表页不再自动调用） |
| POST | `/community/inbox/mark-read-item` | body: `{ inboxId: string }`（如 `comment:uuid`）；逐条标已读，写入 `community_inbox_reads`；响应 `{ ok: true }` |

## 错误

常见：`400` 参数错误，`401` 未登录，`404` 不存在，`500` 服务器错误。响应体多为 `{ error: string }`。

变更 API 时请同步更新本文档。
