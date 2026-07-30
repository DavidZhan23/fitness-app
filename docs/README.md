# 文档中心

按场景点开即可。**不必通读全库。**

## 必读（日常）

| 场景 | 文档 |
|------|------|
| 本地跑起来 | [GETTING-START.md](GETTING-START.md) |
| 开发闭环（grill → 实现 → PR） | [ai-playbook.md](ai-playbook.md) |
| 改 API / 表 | [architecture/api-contract.md](architecture/api-contract.md)（先 TL;DR）→ [overview.md](architecture/overview.md) |
| 部署 | [architecture/deploy.md](architecture/deploy.md) |

闭环触发词 / skills 路径：`bash scripts/dev-loop.sh` · [`.cursor/skills/`](../.cursor/skills/)

## 按需

| 场景 | 文档 |
|------|------|
| 进行中的功能规格 | [milestones/README.md](milestones/README.md)（仅 Active） |
| 历史 milestone | [milestones/archive.md](milestones/archive.md) |
| 贡献说明 | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| 运维细项（DB / 腾讯云 / PWA） | [ops/README.md](ops/README.md) |
| 架构决策 ADR | [decisions/README.md](decisions/README.md) |
| GitHub Issue 需求 | [requirements/README.md](requirements/README.md) · `npm run req:list` |

## 目录说明

| 目录 | 用途 |
|------|------|
| `architecture/` | 系统怎么构成（精简） |
| `milestones/` | 功能规格；Active 进主表，done 进 archive |
| `ops/` | 运维手册（按场景，非必读） |
| `decisions/` | 会后悔才记的 ADR |
| `requirements/` | Issue 需求流 |
