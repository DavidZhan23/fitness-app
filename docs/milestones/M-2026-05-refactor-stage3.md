# Milestone: Refactor Stage 3 — Route Splitting

**Status:** active
**Branch:** `feat/refactor-stage3-routes`
**Issue:** — (内部工程改善，无 GitHub Issue)
**Started:** 2026-05-24

## 1. 任务背景

阶段二（PR #29）已 merge。`server/src/index.js` 仍有 639 行，所有路由堆积在单文件，可读性差、新功能难定位。阶段三将按领域拆出 4 个 Express Router 文件，index.js 缩减为 ~30 行的纯引导文件。行为、URL、契约全部不变。

## 2. 目标 (Goal)

将 `server/src/index.js` 的路由处理逻辑按领域提取至 `server/src/routes/`，保持 API 行为完全等价。

## 3. 成功标准 (Success criteria)

- [ ] `server/src/routes/auth.js` — `/health`, `/auth/*`, `/profile`
- [ ] `server/src/routes/ai.js` — `/ai/*`
- [ ] `server/src/routes/logs.js` — `/day-logs/*`, `/exercises/*`, `/meals/*`, `/templates/*`
- [ ] `server/src/routes/community.js` — `/community/*`
- [ ] `server/src/index.js` ≤ 40 行，仅含 app 初始化 + 挂载 router + start()
- [ ] `node --check server/src/*.js server/src/routes/*.js` 无错
- [ ] `npm run lint && npx tsc -b --noEmit` 通过
- [ ] Stage 2 milestone → done；milestones/README.md 索引更新

## 4. Non-goals

- 不改任何业务逻辑 / SQL
- 不拆前端代码
- 不引入 OpenAPI / shared package
- 不加新测试（Stage 2 已补）
- 不改 URL 路径或响应格式

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-05-refactor-stage2.md`
- [x] `.cursor/rules/06-reuse-first.mdc`
- [x] `server/src/index.js`（改前已全读）

## 6. 已检查的可复用代码（必填）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| asyncHandler | `server/src/asyncHandler.js` | 是 |
| authMiddleware | `server/src/auth.js` | 是 |
| query / db | `server/src/db.js` | 是 |
| 所有业务 helpers | 已在 index.js import | 是，直接迁移 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| `server/src/index.js`（639 行） | 4 个路由文件 + 精简 index.js |

## 8. Edge cases

- `/day-logs/range` 必须在 `/day-logs/:date` 之前注册（Express 参数捕获顺序）
- `/templates/seed` 须在 `/templates/:type` 之前注册，避免 `:type` 捕获 "seed"

## 9. 涉及文件 / 模块（预期）

- `server/src/routes/auth.js` (新建)
- `server/src/routes/ai.js` (新建)
- `server/src/routes/logs.js` (新建)
- `server/src/routes/community.js` (新建)
- `server/src/index.js` (大幅简化)
- `docs/milestones/M-2026-05-refactor-stage2.md` (Status → done)
- `docs/milestones/README.md` (索引更新)

## 10. 实现步骤

1. 写本 milestone 文档（当前步骤）
2. 新建 `server/src/routes/auth.js`
3. 新建 `server/src/routes/ai.js`
4. 新建 `server/src/routes/logs.js`
5. 新建 `server/src/routes/community.js`
6. 精简 `server/src/index.js`
7. `node --check` + lint + tsc
8. 更新 Stage 2 milestone + README 索引

## 11. 测试方案

- `npm run lint && npx tsc -b --noEmit`
- `node --check server/src/*.js server/src/routes/*.js`
- 本地 smoke：启动 server，`curl localhost:3001/health`，登录 / 加运动 / 社区

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| Express 路由注册顺序变化导致 `:param` 路由捕获错误 | Edge cases 节已标注，代码中显式排序 |
| import 路径遗漏 | `node --check` + lint 会暴露 |

## 13. 文档同步计划

- [ ] 本 milestone Status → done + README 索引
- Stage 2 milestone → done（并入本 PR）

## 14. 回滚方案

- `git revert <merge_sha>`；无 schema 变更，行为等价

## 15. 是否满足最小可运行闭环

是——纯路由迁移，行为等价，不影响数据库 / 前端。
