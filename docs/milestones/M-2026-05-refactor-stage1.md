# Milestone: Refactor Stage 1 — Docs & Rules Alignment

**Status:** done
**Branch:** `feat/refactor-stage1-docs`
**Issue:** — (内部工程改善，无 GitHub Issue)
**Started:** 2026-05-24

## 1. 任务背景

工程审查报告（2026-05-24）发现文档与代码漂移、Plan 模板缺关键约束字段、规则层缺「先复用」约束、两处 ADR 决策未文档化。本 milestone 修正这些问题，为后续 Stage 2（代码清理）和 Stage 3（路由拆分）奠基。不动一行业务代码。

## 2. 目标 (Goal)

文档体系与当前代码完全对齐；Plan 模板包含「已阅读文档 / 已复用模块 / 回滚方案 / MVP 切分」；新增「先复用」Cursor 规则；两处漂移修正。

## 3. 成功标准 (Success criteria)

- [x] `docs/milestones/_TEMPLATE.md` 替换为 15 节模板
- [x] `scripts/new-feature.sh` 内嵌骨架同步
- [x] `.cursor/rules/06-reuse-first.mdc` 新建，含可复用模块清单
- [x] `docs/ops/tencent-cloud.md` Supabase 历史段调整
- [x] `docs/GETTING-START.md` `/api/health` → `/health`
- [x] `docs/architecture/overview.md` 补 ER 节 + 社区可见性规则
- [x] `docs/architecture/api-contract.md` 补缺字段
- [x] `M-2026-05-req-intake` Status 改 done，索引更新
- [x] ADR-0003（公式同步策略）+ ADR-0004（时区策略）新建
- [x] `.cursor/rules/01、02、04.mdc` 小补

## 4. Non-goals

- 不改任何 TypeScript / JavaScript 业务代码
- 不加测试（Stage 2 做）
- 不拆路由（Stage 3 做）
- 不合并前后端公式（ADR-0003 标注为未来工作）

## 5. 已阅读的相关文档（必填）

- [x] `docs/ai-playbook.md`
- [x] `docs/architecture/api-contract.md`（改前先读）
- [x] `docs/architecture/overview.md`（改前先读）
- [x] `docs/decisions/README.md`（ADR 新增前读）
- [x] `.cursor/rules/01、02、04.mdc`（小补前读）
- [x] `docs/milestones/_TEMPLATE.md`（替换前读）

## 6. 已检查的可复用代码（必填）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 写 ADR 格式 | `docs/decisions/_template.md` | 是 |
| 写 milestone 格式 | `docs/milestones/_TEMPLATE.md`（改前已读） | 是（替换） |
| .mdc 规则格式 | 现有 `.cursor/rules/*.mdc` | 是（照格式新建） |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 审查报告 P1/P2 问题清单 | 对齐后的文档体系 + 新规则 |
| 当前 `_TEMPLATE.md`（旧） | 15 节新模板 |

## 8. Edge cases

- 只改 markdown / .mdc，无执行路径，无 edge case。

## 9. 涉及文件 / 模块（预期）

- `docs/milestones/_TEMPLATE.md`
- `scripts/new-feature.sh`
- `.cursor/rules/06-reuse-first.mdc` (新建)
- `.cursor/rules/01-planning-clarify.mdc`
- `.cursor/rules/02-coding.mdc`
- `.cursor/rules/04-docs-and-architecture.mdc`
- `docs/ops/tencent-cloud.md`
- `docs/GETTING-START.md`
- `docs/architecture/overview.md`
- `docs/architecture/api-contract.md`
- `docs/milestones/M-2026-05-req-intake.md`
- `docs/milestones/README.md`
- `docs/decisions/0003-formula-sync.md` (新建)
- `docs/decisions/0004-date-tz-strategy.md` (新建)
- `docs/decisions/README.md`

## 10. 实现步骤

**MVP（本次必交）：**

1. 写本 milestone 文档（当前步骤）
2. 替换 `_TEMPLATE.md` + 同步 `new-feature.sh`
3. 新建 `06-reuse-first.mdc`
4. 修 tencent-cloud.md Supabase 段
5. 修 GETTING-START.md /api/health
6. 补 overview.md ER + 可见性规则
7. 补 api-contract.md 缺字段
8. 收尾 req-intake milestone 状态
9. 新建 ADR-0003、ADR-0004，更新 decisions/README.md
10. 小补 rules 01、02、04

**后续（不做）：**

- tencent-cloud.md 大规模重写（保留历史背景即可）

## 11. 测试方案

- `npm run lint && npm run typecheck`（应无变化，纯 md）
- 人工预览各 md 文件

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 修 tencent-cloud.md 时误删有用内容 | 只改开篇定性段，保留操作步骤 |
| ADR 格式与现有不一致 | 按 `docs/decisions/_template.md` 格式写 |

## 13. 文档同步计划

- 本文档自身即 stage1 输出
- 完成后 Status 改 done，milestones/README.md 登记

## 14. 回滚方案

- 纯 markdown，`git revert <merge_sha>` 无副作用

## 15. 是否满足最小可运行闭环

是——不影响应用运行，全部是文档与规则变更。
