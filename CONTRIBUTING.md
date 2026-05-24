# Contributing to fitness-app

感谢参与 [DavidZhan23/fitness-app](https://github.com/DavidZhan23/fitness-app)。

> **文档入口：** [docs/README.md](docs/README.md)（按角色导航）· [docs/GETTING-START.md](docs/GETTING-START.md)（本地跑起来）· [docs/ai-playbook.md](docs/ai-playbook.md)（Cursor 协作）

## 快速流程

```text
Issue 随手记 → npm run req:list → Cursor 澄清 + milestone
→ feat/* 实现 → lint/typecheck → 回复 go → ai-flow.sh → draft PR → merge
```

| 步骤 | 命令 / 动作 |
|------|-------------|
| 本地环境 | [docs/GETTING-START.md](docs/GETTING-START.md) |
| 看待办 | `npm run req:list` |
| 开功能分支 | `bash scripts/new-feature.sh <slug>` |
| 提交 PR | `bash scripts/ai-flow.sh -m "feat(scope): ..."`（先等 AI confirm，你回复 `go`） |
| 观察 CI | 终端 Cmd+Click 链接或 `gh run watch` |

**禁止**直接 push / commit 到 `main`。

## 提需求（GitHub）

Issues → **Feature request** / **Bug report**。标题一句话即可，其余可空。详见 [docs/requirements/README.md](docs/requirements/README.md)。

Owner 首次配置 labels / 看板：[docs/requirements/github-project-setup.md](docs/requirements/github-project-setup.md)。

## 两种贡献身份

**Collaborator：** `git push origin feat/<slug>` + `ai-flow.sh`

**Fork：**

```bash
git push -u <fork-remote> feat/<slug>
gh pr create --repo DavidZhan23/fitness-app --head <user>:feat/<slug> --draft
```

`ai-flow.sh` 不自动处理 fork。

## 分支与 Commit

| 类型 | 前缀 | 示例 |
|------|------|------|
| 功能 | `feat/` | `feat/12-export-csv` |
| 修复 | `fix/` | `fix/login-error` |
| 文档 | `docs/` | `docs: refresh doc hub` |

[Conventional Commits](https://www.conventionalcommits.org/) + 本地 commitlint。

PR 关联 issue 时在正文写：`Closes #N`。

## CI（[ci.yml](.github/workflows/ci.yml)）

| Job | 说明 |
|-----|------|
| lint | ESLint（历史债务可能 warn，`continue-on-error`） |
| typecheck | `tsc -b --noEmit` |
| build | 前端生产构建 |
| server-syntax | `node --check` |

失败排查：[docs/architecture/deploy-pipeline.md](docs/architecture/deploy-pipeline.md)。

## Owner 清单

1. Branch protection on `main`（PR、review、required checks）
2. 自动部署：[docs/architecture/owner-setup-guide.md](docs/architecture/owner-setup-guide.md)

## 文档索引

| 主题 | 路径 |
|------|------|
| 总导航 | [docs/README.md](docs/README.md) |
| 架构 / API | [docs/architecture/](docs/architecture/) |
| 运维 / 部署 | [docs/ops/README.md](docs/ops/README.md) |
| Milestones | [docs/milestones/](docs/milestones/) |
| ADR | [docs/decisions/](docs/decisions/) |
