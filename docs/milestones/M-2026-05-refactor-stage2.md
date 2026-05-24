# Milestone: Refactor Stage 2 — Cleanup, Tests & Secret Hardening

**Status:** done
**Branch:** `feat/refactor-stage2-cleanup`
**Issue:** — (内部工程改善，无 GitHub Issue)
**Started:** 2026-05-24

## 1. 任务背景

阶段一（PR #11）已 merge。审查报告 P0/P1 项中，代码层债务需在拆路由（阶段三）前清理：secret fallback、重复 helper、死代码、最小 parity 测试。

## 2. 目标 (Goal)

小范围代码清理 + vitest 纯函数测试 + P0 secret 启动断言；行为不变，URL/契约不变。

## 3. 成功标准 (Success criteria)

- [ ] `JWT_SECRET` / `REGISTRATION_KEY` 无 fallback，缺失 env 时启动 fail-fast
- [ ] 删 `getDeficitIntensityLevel`、`hideCommunityIfYesterdayEmpty`
- [ ] `server/src/publicProfile.js` 单点 `publicNickname`
- [ ] `server/src/errorMiddleware.js` 承接 PG 错误翻译
- [ ] `httpData.*` 去掉未使用 `_userId` 形参
- [ ] vitest + 7 组纯函数测试；CI 加 `test` job
- [ ] 文档：`server/.env.example`、`GETTING-START.md`、`owner-setup-guide.md` 同步

## 4. Non-goals

- 不拆 `server/src/index.js`（阶段三）
- 不创建 shared 包 / npm workspaces
- 不引入 OpenAPI / JSON Schema
- 不合并 `runMigrations()` 与 SQL 文件

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-05-refactor-stage1.md`
- [x] `docs/decisions/0003-formula-sync.md`
- [x] `.cursor/rules/06-reuse-first.mdc`
- [x] `docs/architecture/owner-setup-guide.md`
- [x] `docs/GETTING-START.md`

## 6. 已检查的可复用代码（必填）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 公开昵称 | 三处 local `publicNickname` | 否 → 抽 `publicProfile.js` |
| 错误 middleware | `index.js` 内联 | 否 → 抽 `errorMiddleware.js` |
| BMR/TDEE 测试 | 无 | 新建 parity 向量 |
| env 必填校验 | 无 | 新建（auth + registrationKey） |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 审查报告阶段二清单 | 清理后的 server/src + vitest + CI test job |

## 8. Edge cases

- CI / vitest 不 import `auth.js`，无需 DB；本地 dev 须已有 `server/.env`
- docker-compose 仍通过 env 注入 secret，生产 `deploy/.env` 必填

## 9. 涉及文件 / 模块（预期）

- `server/src/auth.js`, `registrationKey.js`, `publicProfile.js`, `errorMiddleware.js`
- `server/src/community.js`, `social.js`, `communityInbox.js`, `index.js`
- `src/lib/calories.ts`, `src/lib/api/index.ts`, `src/lib/dayLogService.ts`
- `src/context/AuthContext.tsx`, `src/pages/CalendarPage.tsx`
- `vitest.config.ts`, `server/test/*`, `src/lib/__tests__/*`
- `.github/workflows/ci.yml`, `package.json`
- `docs/GETTING-START.md`, `docs/architecture/owner-setup-guide.md`

## 10. 实现步骤

**MVP（本次必交）：** 2.1–2.6 全部

**后续（不做）：** 路由拆分、shared 包

## 11. 测试方案

- `npm run lint && npm run typecheck && npm run test`
- `node --check server/src/*.js`
- 本地 smoke：登录 / 加运动 / 社区

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 去掉 secret fallback 导致忘配 .env 启动失败 | `.env.example` + GETTING-START 强调必填 |
| _userId 清理漏改调用点 | typecheck 会报错 |

## 13. 文档同步计划

- [x] `server/.env.example`
- [x] `docs/GETTING-START.md`
- [x] `docs/architecture/owner-setup-guide.md`
- [ ] 本 milestone Status → done + README 索引

## 14. 回滚方案

- `git revert <merge_sha>`；无 schema 变更

## 15. 是否满足最小可运行闭环

是——行为等价，仅内部结构与测试增强。
