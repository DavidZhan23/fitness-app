# AI 协作手册（Cursor + 本项目）

给 **Cursor Agent** 与 **使用 Cursor 的开发者**：按本页和 `.cursor/rules/` 协作，避免跳步或误提交。

> 文档总导航：[README.md](README.md) · 主流程图：[assets/diagrams/dev-workflow.svg](assets/diagrams/dev-workflow.svg)

## 读文档顺序（新功能）

| 顺序 | 文件 | 何时读 |
|------|------|--------|
| 1 | 用户提到的 GitHub Issue（`gh issue view N`） | 从「开始 #N」接手时 |
| 2 | `docs/milestones/<slug>.md` 或 [_TEMPLATE.md](milestones/_TEMPLATE.md) | 规划与实现全程 |
| 3 | `docs/architecture/api-contract.md` | 动 API 时 |
| 4 | `docs/architecture/overview.md` | 不确定表结构 / 模块边界时 |
| 5 | `docs/architecture/deploy-pipeline.md` | 只改 CI/CD 时 |

**不要**在未读 active milestone 的情况下大改业务代码（`02-coding`）。

## 标准流程（Agent 检查清单）

```text
[ ] 1. 澄清（01-planning）：≤5 问/轮 → 写 milestone（Goal / 验收 / Non-goals / 风险）
[ ] 2. 开分支：feat/<slug> 或 feat/<issue-n>-<slug>（勿在 main 上 commit）
[ ] 3. 实现（02-coding）：最小 diff，匹配 src/ 与 server/ 风格
[ ] 4. Smoke：npm run lint && npm run typecheck；server 改动则 node --check
[ ] 5. 提交闸门（03-commit-and-push）：打印 confirm → **仅用户 go 后** commit/push
[ ] 6. ai-flow.sh：draft PR，PR 正文含 Closes #N（若关联 issue）
[ ] 7. 契约：API/表变更则更新 api-contract / migrations / milestone 勾选
```

## 模糊需求时 Agent 应做什么

1. **规划** — 澄清边界 → 创建或更新 `docs/milestones/<slug>.md`（结构见 [_TEMPLATE.md](milestones/_TEMPLATE.md)）
2. **实现** — 按 milestone 改代码；同一问题失败两次则停下复盘（`02-coding` Stuck rule）
3. **确认** — 输出 confirm 摘要，**等用户 `go`**
4. **交付** — `bash scripts/ai-flow.sh --message "feat(scope): ..."`

## Agent 禁止事项

- 未经确认 `git commit` / `git push`
- push 到 `main` 或在 `main` 上 commit
- 在已有 PR 的分支上堆**无关**功能
- 把 Secret 写入代码或文档
- 替 owner 配置生产 SSH / GitHub Secrets（见 `05-owner-cd-setup`）

## 常用命令

```bash
# 需求
npm run req:list
npm run req:list -- --all

# 分支 + milestone 骨架
bash scripts/new-feature.sh my-feature

# 实现后
npm run lint && npm run typecheck
bash scripts/ai-flow.sh --message "feat(scope): description"
```

## Issue ↔ 开发 ↔ 状态

| 阶段 | GitHub | 本地 |
|------|--------|------|
| 随手记 | New issue → `status:todo` | — |
| 开工 | — | Cursor 澄清 + milestone |
| 开发中 | PR 含 `Closes #N` → `status:doing` | `feat/*` |
| 完成 | merge → issue 关闭 | milestone 标 done |

Cursor **不会**在澄清后自动回写 issue；状态靠 label workflow 与 PR。见 [requirements/README.md](requirements/README.md)。

## 看 CI / CD

1. 终端 **Cmd+Click** `ai-flow.sh` 打印的 PR / Actions / Run 链接
2. 或 `gh run watch`
3. **Deploy** 仅 owner merge 到 `main` 后运行（见 [deploy-pipeline.md](architecture/deploy-pipeline.md)）

## Owner 专用

在 Cursor 说「帮我配自动部署」，或读 [owner-setup-guide.md](architecture/owner-setup-guide.md)。

## Fork 贡献者

`ai-flow.sh` 默认 collaborator 路径 → [CONTRIBUTING.md](../CONTRIBUTING.md) Fork 一节。
