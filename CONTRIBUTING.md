# Contributing to fitness-app

感谢参与 [DavidZhan23/fitness-app](https://github.com/DavidZhan23/fitness-app)。

> 文档入口：[docs/README.md](docs/README.md) · [docs/GETTING-START.md](docs/GETTING-START.md) · [docs/ai-playbook.md](docs/ai-playbook.md)（开发闭环 + skills）

## 当前交付流程

```text
提需求 → grill-me 确认 → 实现 → persona-ui-test（UI）→ npm run verify
  → commit/push on dev/huanghongli → PR → main → owner 手动部署
```

闭环细节与触发词见 [docs/ai-playbook.md](docs/ai-playbook.md)。其它开发者可复用同一套 `.cursor/skills/` 与规则；个人长驻分支名可自定（本仓默认 `dev/huanghongli`）。

| 步骤 | 命令 / 动作 |
|------|-------------|
| 本地环境 | [docs/GETTING-START.md](docs/GETTING-START.md) |
| 看待办 | `npm run req:list` |
| 本地门禁 | `npm run verify` |
| 分支 / PR | `dev/huanghongli` → PR `main`（闭环内可自动提交；adhoc 仍需确认） |
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
