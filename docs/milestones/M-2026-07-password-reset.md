# Milestone: 登录页密码找回

**Status:** done
**Branch:** `main`
**Started:** 2026-07-10

## 1. 任务背景

用户忘记密码后只能找开发者手动改库，登录入口缺少自助找回能力。

## 2. 目标 (Goal)

在登录页提供邮箱找回密码：用户输入邮箱后收到一次性链接，打开链接后设置新密码，并可用新密码登录。

## 3. 成功标准 (Success criteria)

- [x] 登录页可切换到「忘记密码」并提交邮箱。
- [x] 后端生成一次性、限时的重置 token，只保存哈希。
- [x] 邮件配置存在时发送重置链接；本地未配置时可通过 API 日志自测。
- [x] 打开邮件链接后可设置新密码，成功后 token 失效。

## 4. Non-goals

- 不做邮箱注册验证。
- 不做短信、第三方登录或管理员后台代重置。
- 不更改现有注册密钥流程。

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-07-password-reset.md` 自身
- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md` ER 节
- [x] `README.md`

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| API 调用 | `src/lib/api/http.ts#apiFetch` | 是 |
| 登录/注册入口 | `src/lib/api/index.ts#httpAuth`、`src/context/AuthContext.tsx` | 是 |
| 密码哈希 | `server/src/auth.js` 中 bcrypt 模式 | 是 |
| DB 迁移 | `server/migrations/*.sql` + `server/src/db.js#runMigrations` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 邮箱 | 统一成功响应，若账号存在则发送重置邮件 |
| token + 新密码 | 密码更新成功响应 |

## 8. Edge cases

- 邮箱不存在：仍返回成功，避免枚举账号。
- token 过期、已使用或伪造：返回 400。
- 重复发送：新 token 生成后废弃该用户未使用的旧 token。
- 邮件未配置：本地开发输出日志；生产返回邮件配置错误。

## 9. 涉及文件 / 模块（预期）

- `src/pages/LoginPage.tsx`
- `src/lib/api/index.ts`
- `server/src/auth.js`
- `server/src/passwordReset.js`
- `server/src/mailer.js`
- `server/src/routes/auth.js`
- `server/migrations/031_password_reset_tokens.sql`
- `docs/architecture/api-contract.md`
- `docs/architecture/overview.md`
- `README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 建表保存重置 token 哈希、过期时间、使用时间。
2. 增加请求重置与确认重置 API。
3. 增加 SMTP/开发日志邮件发送。
4. 登录页支持发送邮件与链接重置。

**后续（不做）：**

- 发送频率限制、邮件模板管理、重置成功通知邮件。

## 11. 测试方案

- `npm run typecheck`
- `node --check server/src/passwordReset.js server/src/mailer.js server/src/routes/auth.js`
- 可选本地 smoke：提交忘记密码邮箱，使用日志链接重置。

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 邮件配置错误导致无法发送 | 本地日志模式 + 生产明确错误 |
| token 泄漏 | 随机 32 字节 token、仅存 SHA-256、一次性使用、1 小时过期 |
| 账号枚举 | 请求重置接口始终返回同样成功响应 |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md`
- [x] 根 `README.md`「功能」一节
- [x] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert PR。
- DB：保留空闲 `password_reset_tokens` 表不影响现有登录；如需清理可手动 drop。
- 部署：回滚上一版 API 与前端构建。

## 15. 是否满足最小可运行闭环

是——用户可从登录页请求邮件链接，并在登录页设置新密码。
