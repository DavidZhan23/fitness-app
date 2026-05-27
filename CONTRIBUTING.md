# Contributing to fitness-app

感谢参与 [DavidZhan23/fitness-app](https://github.com/DavidZhan23/fitness-app)。

> 文档入口：[docs/README.md](docs/README.md) · [docs/GETTING-START.md](docs/GETTING-START.md) · [docs/ai-playbook.md](docs/ai-playbook.md)

## 当前交付流程

```text
Issue/需求 → Cursor 澄清 + milestone → 实现 → npm run verify → 用户确认 → push main → owner 手动部署
```

| 步骤 | 命令 / 动作 |
|------|-------------|
| 本地环境 | [docs/GETTING-START.md](docs/GETTING-START.md) |
| 看待办 | `npm run req:list` |
| 本地门禁 | `npm run verify` |
| 提交推送 | 用户确认后 `git commit` + `git push origin main` |
| 手动部署 | owner 执行 `npm run deploy:tencent` / `npm run deploy:tencent:api` |

## Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：
`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`。

## 提需求（GitHub）

Issues → **Feature request** / **Bug report**。标题一句话即可。详见 [docs/requirements/README.md](docs/requirements/README.md)。

## 文档索引

| 主题 | 路径 |
|------|------|
| 总导航 | [docs/README.md](docs/README.md) |
| 架构 / API | [docs/architecture/](docs/architecture/) |
| 运维 / 部署 | [docs/ops/README.md](docs/ops/README.md) |
| Milestones | [docs/milestones/](docs/milestones/) |
| ADR | [docs/decisions/](docs/decisions/) |
