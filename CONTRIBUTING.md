# Contributing to fitness-app

感谢参与 [DavidZhan23/fitness-app](https://github.com/DavidZhan23/fitness-app)。本文说明本地开发、提交流程与如何观察 CI/CD。

## 前置条件

- Node.js 22+、npm
- PostgreSQL 16（本地 Homebrew）— [docs/本地数据库启停.md](docs/本地数据库启停.md)
- [GitHub CLI](https://cli.github.com/)：`gh auth login`
- [Cursor](https://cursor.com/)（推荐，加载 `.cursor/rules/`）

```bash
git clone https://github.com/DavidZhan23/fitness-app.git
cd fitness-app
npm install
cp .env.example .env.local
cp server/.env.example server/.env
# 按 本地数据库启停.md 建库并跑 migrations
```

## 两种贡献身份

### A. Collaborator（owner 已邀请）

- 直接 `git push origin feat/<slug>`
- 使用 `bash scripts/ai-flow.sh` 完成 commit / push / draft PR

### B. Fork 贡献者

```bash
gh repo fork DavidZhan23/fitness-app --remote --clone
# 开发后
git push -u <your-fork-remote> feat/<slug>
gh pr create --repo DavidZhan23/fitness-app --head <your-github-user>:feat/<slug> --draft
```

`ai-flow.sh` 当前**不**自动处理 fork；需手动 push 与 `gh pr create --repo`。

## 推荐开发流程

1. **开分支与 milestone**  
   `bash scripts/new-feature.sh <slug>`

2. **在 Cursor 描述需求**  
   Rules 会引导澄清边界，并维护 `docs/milestones/<slug>.md`。

3. **实现 + 本地 smoke**  
   ```bash
   npm run lint && npm run typecheck
   ```

4. **人工确认后提交**  
   AI 会输出 confirm 摘要；你回复 `go` 后执行：  
   ```bash
   bash scripts/ai-flow.sh --message "feat(scope): description"
   ```

5. **观察 CI（Cursor 内）**  
   - 终端 **Cmd+Click** 脚本打印的 PR / Actions / Run 链接（Simple Browser）  
   - 或按 Enter 运行 `gh run watch`

6. **Mark PR ready** → 等待 @DavidZhan23 review 并 **merge**

7. **合并后**  
   - 若 owner 已启用 [自动部署](docs/architecture/owner-setup-guide.md)，main 合并会触发 Deploy workflow  
   - 可选：release-please 维护 [CHANGELOG.md](CHANGELOG.md)

## 分支与 commit

| 类型 | 前缀 | 示例 |
|------|------|------|
| 功能 | `feat/` | `feat/export-csv` |
| 修复 | `fix/` | `fix/login-error` |
| 文档 | `docs/` | `docs/api-contract` |
| 杂项 | `chore/` | `chore/ci` |

Commit message 使用 [Conventional Commits](https://www.conventionalcommits.org/)，本地 husky + commitlint 会校验。

**禁止**直接 push 到 `main`。

## CI 跑什么

Push 或 PR 触发 [.github/workflows/ci.yml](.github/workflows/ci.yml)：

- `lint` — ESLint
- `typecheck` — `tsc -b --noEmit`
- `build` — 前端生产构建
- `server-syntax` — `node --check` on server modules

全绿后 owner 方可 merge（需 owner 配置 branch protection）。

> **说明：** 若 `lint` job 因历史代码告警失败，可先修 ESLint 或单独开 PR；`typecheck`、`build`、`server-syntax` 应通过。

## 给 Owner（@DavidZhan23）合并本 PR 后请做

1. **Branch protection** on `main`：Require PR、1 approval、Code Owners、required status checks、no bypass  
2. （可选）Review 默认要求 @DavidZhan23  
3. **自动部署**：见 [docs/architecture/owner-setup-guide.md](docs/architecture/owner-setup-guide.md) 或 Cursor 说「帮我配自动部署」

## 文档导航

- [docs/README.md](docs/README.md)
- [架构总览](docs/architecture/overview.md)
- [部署流水线](docs/architecture/deploy-pipeline.md)
- [AI 协作手册](docs/ai-playbook.md)

## 出问题

- CI 失败：对照 [deploy-pipeline.md](docs/architecture/deploy-pipeline.md) 速查表  
- 本地数据库：[本地数据库启停.md](docs/本地数据库启停.md)
