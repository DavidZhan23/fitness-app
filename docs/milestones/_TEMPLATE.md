# Milestone: <一句话标题>

**Status:** active | done | cancelled
**Branch:** `feat/<slug>`
**Issue:** #<n>（可选）
**Started:** YYYY-MM-DD

## 1. 任务背景

<!-- 触发这次工作的 issue / 反馈 / 痛点。一段话。 -->

## 2. 目标 (Goal)

<!-- 这次 done 长什么样。1-2 句。 -->

## 3. 成功标准 (Success criteria)

- [ ] 可验收项 1
- [ ] 可验收项 2

## 4. Non-goals

- 明确不做什么

## 5. 已阅读的相关文档（必填）

> plan 冻结前必须勾完，否则不算完整 plan。

- [ ] `docs/milestones/<slug>.md` 自身
- [ ] `docs/architecture/api-contract.md`（若动 API）
- [ ] `docs/architecture/overview.md` ER 节（若动表）
- [ ] 其它：

## 6. 已检查的可复用代码（必填，避免造轮子）

> 在 `src/lib/` 与 `server/src/` 用关键词 grep，命中就复用，不新写。
> 参考清单：见 `.cursor/rules/06-reuse-first.mdc`。

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 例：算当日缺口 | `src/lib/metabolism.ts#calculateSpreadDeficit` | 是 |
| | | |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| | |

## 8. Edge cases

- 空数据 / 断网 / 跨日 / 跨用户 / 权限：

## 9. 涉及文件 / 模块（预期）

- `src/...`
- `server/...`
- `server/migrations/NNN_<slug>.sql`（若改 schema，同时更新 `server/src/db.js#runMigrations`）
- `docs/...`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1.
2.

**后续（不做）：**

-

## 11. 测试方案

- 纯函数单测：`server/test/...` 或 `src/lib/__tests__/...`
- Smoke：`npm run lint && npm run typecheck`；touch server 则 `node --check server/src/index.js`
- 手动验证步骤 / curl：

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| | |

## 13. 文档同步计划（合并前必须完成）

- [ ] `docs/architecture/api-contract.md`（若动 API）
- [ ] `docs/architecture/overview.md` ER 节（若动表）
- [ ] `docs/architecture/deploy-pipeline.md`（若动 CI/CD）
- [ ] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert PR
- DB：是否需要补 down migration？（列在这里）
- 部署：上一个 release 的 `dist` symlink 路径

## 15. 是否满足最小可运行闭环

是 / 否——（说明：用户能完整跑一次端到端的主路径了吗？）

---

创建方式：`bash scripts/new-feature.sh <slug>` 会生成同名骨架；
复杂功能复制本模板到 `M-YYYY-MM-<slug>.md` 并在 [README](README.md) 登记。
