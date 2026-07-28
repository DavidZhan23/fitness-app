# Milestone: 开发闭环（grill → 实现 → 拟人 → verify → auto-commit）

**Status:** active
**Branch:** `dev/huanghongli`
**Issue:** —
**Started:** 2026-07-28

## 1. 任务背景

需要可共享的项目范式：用户只提需求并答 grill；确认 shared understanding 后 Agent 一条龙改码、拟人测、verify、在个人分支提交并开/更新 PR。文档保持精简。

## 2. 目标 (Goal)

仓库内具备 grill-me / explain-code / persona-ui-test；规则与 playbook 写明闭环自动提交（`dev/huanghongli`）与 adhoc 确认门的区别；架构文档有短 TL;DR。

## 3. 成功标准 (Success criteria)

- [x] `.cursor/skills/{grill-me,explain-code,persona-ui-test}/SKILL.md` 可发现
- [x] grill：一次一问 + 推荐；先读码；决策入 milestone；未确认不写生产代码
- [x] 确认后：实现 → UI 则 persona → verify → 可 auto-commit（无需第二次 `go`）
- [x] Adhoc 提交仍走确认门
- [x] `AGENTS.md` + rules `00`–`03` + 短 `ai-playbook.md` 一致
- [x] `docs/README` 有闭环 hub；CONTRIBUTING / GETTING-START 轻量挂钩
- [x] architecture overview / api-contract 文首 TL;DR

## 4. Non-goals

- 不完成无关产品功能（打卡墙 / AI 语音等 WIP 另存 stash）
- 不建 GitHub Actions 拟人流水线
- 不拉长 playbook / 架构正文

## 5. 已阅读的相关文档（必填）

- [x] 本 milestone
- [x] `docs/ai-playbook.md`
- [x] `.cursor/rules/01-planning-clarify.mdc` / `03-commit-and-push.mdc`
- [x] create-skill 约定

## 6. 已检查的可复用代码（必填）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 严苛澄清 | grill-me + planning 规则 | 是 |
| 拟人测 | cursor-ide-browser | 是 |
| 分支同步 | `scripts/new-feature.sh` | 是（改为个人长驻分支） |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 闭环产品意图 | skills + rules + 短 docs + `scripts/dev-loop.sh` |

## 8. Edge cases

- `直接修复` 可跳过 grill；提交默认 Adhoc 确认
- 拟人探查默认不大改产品

## 9. 涉及文件 / 模块

- `.cursor/skills/**`、`.cursor/rules/00–03`、`AGENTS.md`
- `docs/ai-playbook.md`、`docs/README.md`、milestone 索引、架构 TL;DR
- `scripts/new-feature.sh`、`scripts/dev-loop.sh`

## 10. 实现步骤

**MVP：** 上表落地。**后续：** CI 拟人流水线（不做）。

## 11. 测试方案

- Docs/skills 静态检查；可选 `bash scripts/verify-local.sh --skip-e2e`
- 手动：对话触发 grill / 讲解 / 拟人测应加载对应 skill

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 自动提交误伤 | 仅 closed-loop（已确认 shared understanding）可跳过 `go` |
| 文档膨胀 | playbook 控制在短清单；架构只加 TL;DR |

## 13. 文档同步计划

- [x] playbook / README hub / CONTRIBUTING / GETTING-START
- [ ] Status → `done`（验收/合并后）

## 14. 回滚

Revert 本 milestone 相关 commits；删除 `.cursor/skills/` 三目录。

## 15. 是否满足最小可运行闭环

是——其它开发者可按 playbook 走同一范式（分支名可自定）。
