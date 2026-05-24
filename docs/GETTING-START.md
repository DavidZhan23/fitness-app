# 本地开发入门

把项目在电脑上跑起来。PR、Issue、Cursor 流程见 [CONTRIBUTING.md](../CONTRIBUTING.md) 与 [ai-playbook.md](ai-playbook.md)。

## 前置

| 工具 | 版本 / 说明 |
|------|-------------|
| Node.js | 22+ |
| npm | 随 Node |
| PostgreSQL | 16（推荐 Homebrew） |
| GitHub CLI | 可选，`gh auth login`（提 PR / `req:list`） |
| Cursor | 推荐，自动加载 `.cursor/rules/` |

## 1. 克隆与安装

```bash
git clone https://github.com/DavidZhan23/fitness-app.git
cd fitness-app
npm install
cd server && npm install && cd ..
```

## 2. 环境变量

```bash
cp .env.example .env.local
cp server/.env.example server/.env
```

| 文件 | 关键项 |
|------|--------|
| `.env.local` | `VITE_API_URL=http://localhost:3001` |
| `server/.env` | `DATABASE_URL`、`JWT_SECRET`、`REGISTRATION_KEY` 等，见 `server/.env.example`（后两项**必填**，缺失时 API 拒绝启动） |

## 3. 数据库

按 [ops/本地数据库启停.md](ops/本地数据库启停.md)：

```bash
brew services start postgresql@16
createdb fitness   # 若尚未创建
# 按文档顺序执行 server/migrations/*.sql
```

## 4. 启动服务

**终端 A — API：**

```bash
cd server && npm run dev
# 默认 http://localhost:3001
```

**终端 B — 前端：**

```bash
npm run dev
# http://localhost:5173
```

健康检查：`curl http://localhost:3001/health` → `{"ok":true}`

> 注意：`/api` 前缀仅在生产环境 Nginx 反代时生效；本地直连 API 服务（3001 端口）不带此前缀。

## 5. 提交前自检

```bash
npm run lint
npm run typecheck
npm run test          # Vitest 纯函数
npm run test:e2e      # Playwright 主流程冒烟（需 PostgreSQL 可用）
# 若改了 server：
node --check server/src/index.js
```

**E2E 说明：** `npm run test:e2e` 会通过 Playwright 自动启动 API（3101）与 Vite（4173），默认 `REGISTRATION_KEY=e2e-test-key`。这样可避免误复用你手动启动且配置不同的 dev server。

如需复用已启动服务（例如你在本地调试时固定跑 3001/5173），请显式开启：

```bash
PW_REUSE_SERVER=1 PLAYWRIGHT_API_PORT=3001 PLAYWRIGHT_WEB_PORT=5173 REGISTRATION_KEY=454676 npm run test:e2e
```

首次运行需安装浏览器：`npx playwright install chromium`

与 CI [.github/workflows/ci.yml](../.github/workflows/ci.yml) 一致。

## 6. 开始一个新功能

```bash
bash scripts/new-feature.sh <slug>
```

会创建 `feat/<slug>` 与 [milestones/_TEMPLATE.md](milestones/_TEMPLATE.md) 结构的规格文档。

## 查看文档里的流程图

打开 `docs/architecture/overview.md` 等文件，按 **`Cmd+Shift+V`** 预览。图为 **SVG 配图**（`docs/assets/diagrams/`），会直接显示图形，不是 Mermaid 源码块。

## 下一步

- [CONTRIBUTING.md](../CONTRIBUTING.md) — 分支、Issue、`ai-flow.sh`
- [ai-playbook.md](ai-playbook.md) — Cursor 协作
- [architecture/overview.md](architecture/overview.md) — 系统与数据模型
