# API 契约

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
| POST | `/auth/register` | email, password, registration_key | 注册 |
| POST | `/auth/login` | email, password | 登录 |
| GET | `/auth/me` | — | 当前用户 |

## 资料

| Method | Path | 说明 |
|--------|------|------|
| GET | `/profile` | 读取资料 |
| PATCH | `/profile` | 更新资料（BMR/TDEE 等） |

## AI

| Method | Path | 说明 |
|--------|------|------|
| POST | `/ai/estimate-kcal` | DeepSeek 估算千卡（需服务端 Key） |

## 日记录

| Method | Path | 说明 |
|--------|------|------|
| GET | `/day-logs/range` | 日期范围查询 |
| GET | `/day-logs/:date` | 单日详情 |
| POST | `/day-logs/ensure` | 确保当日 log 存在 |
| POST | `/exercises` | 添加运动 |
| PATCH/DELETE | `/exercises/:id` | 更新/删除运动 |
| POST | `/meals` | 添加饮食 |
| PATCH/DELETE | `/meals/:id` | 更新/删除饮食 |

## 模板

| Method | Path | 说明 |
|--------|------|------|
| GET/POST | `/templates/:type` | type: `exercise` \| `meal` |
| DELETE | `/templates/:type/:id` | 删除模板 |
| POST | `/templates/seed` | 种子默认模板 |

## 社区

| Method | Path | 说明 |
|--------|------|------|
| GET | `/community/members` | 成员列表 |
| PUT | `/community/member-order` | 排序 |
| GET | `/community/users/:userId` | 用户公开页 |
| GET | `/community/users/:userId/month` | 月历 |
| POST/DELETE | `/community/users/:userId/follow` | 关注 |
| POST/DELETE | `/community/users/:userId/likes` | 点赞日 |
| GET/POST | `/community/users/:userId/comments` | 评论 |
| DELETE | `/community/comments/:commentId` | 删评论 |
| POST/DELETE | `/community/comments/:commentId/likes` | 点赞/取消点赞评论 |
| PUT | `/community/users/:userId/log-items/:itemType/:itemId/reaction` | 条目反应 |
| GET | `/community/inbox/unread` | 未读 |
| POST | `/community/inbox/mark-read` | 标已读 |

## 错误

常见：`400` 参数错误，`401` 未登录，`404` 不存在，`500` 服务器错误。响应体多为 `{ error: string }`。

变更 API 时请同步更新本文档。
