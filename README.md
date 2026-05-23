# 健身打卡 — 热量追踪 PWA

[![CI](https://github.com/DavidZhan23/fitness-app/actions/workflows/ci.yml/badge.svg)](https://github.com/DavidZhan23/fitness-app/actions/workflows/ci.yml)
[![Deploy](https://github.com/DavidZhan23/fitness-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/DavidZhan23/fitness-app/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/DavidZhan23/fitness-app?label=release)](https://github.com/DavidZhan23/fitness-app/releases)

记录每日运动与饮食，结合基础代谢计算热量缺口，并以打卡墙展示运动与缺口。

> **仓库维护者（@DavidZhan23）**：合并 PR 后若需自动上线，见 [docs/architecture/owner-setup-guide.md](docs/architecture/owner-setup-guide.md)（或在 Cursor 说「帮我配自动部署」）。

## 功能

- 邮箱注册 / 登录，数据同步至自托管 API
- 身体资料 → 自动计算 BMR / TDEE（Mifflin-St Jeor）
- 记录运动、饮食及大卡，自动汇总当日缺口
- 运动 / 饮食快捷模板
- 打卡墙 + 社区公开动态
- PWA：手机浏览器「添加到主屏幕」即可像 App 使用

## 开发流程速览

1. `bash scripts/new-feature.sh <slug>` — 开 `feat/*` 分支与 milestone 文档  
2. 在 Cursor 描述需求（`.cursor/rules` 会引导澄清边界）  
3. 本地 `npm run lint` / `npm run typecheck`  
4. 确认 AI 的 commit 摘要后回复 `go` → `bash scripts/ai-flow.sh -m "feat: ..."`  
5. 终端 Cmd+Click 链接查看 CI；draft PR 自查后 mark ready  
6. @DavidZhan23 review 并 merge  

详见 [CONTRIBUTING.md](CONTRIBUTING.md)、[docs/ai-playbook.md](docs/ai-playbook.md)。

## 本地开发

**本地数据库启停：** 见 [docs/本地数据库启停.md](docs/本地数据库启停.md)。

### 1. 启动数据库与 API

```bash
brew services start postgresql@16   # 见 docs/本地数据库启停.md
cd server && npm install && npm run dev
```

`server` 需配置 `DATABASE_URL` 等，见 `server/.env.example`。

### 2. 配置前端

```bash
cp .env.example .env.local
# 编辑 VITE_API_URL=http://localhost:3001
```

### 3. 启动前端

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。

## 部署到腾讯云

**Contributor**：合并由 owner 执行；自动部署需 owner 启用 workflow。

**手动部署（现有）：**

- 一步步指南：[docs/腾讯云部署-一步步做.md](docs/腾讯云部署-一步步做.md)  
- 服务器 DeepSeek Key：[docs/修改服务器env.md](docs/修改服务器env.md)  
- CI/CD 与自动部署说明：[docs/architecture/deploy-pipeline.md](docs/architecture/deploy-pipeline.md)

```bash
cp .env.deploy.example .env.deploy   # 填写 SERVER_IP
npm run deploy:tencent               # 仅更新前端
npm run deploy:tencent:api           # 前端 + 后端
```

服务器：`cd deploy && docker compose up -d --build`

## 添加到手机主屏幕

**iPhone（Safari）**：分享 → **添加到主屏幕**

**Android（推荐 Chrome）**：菜单 ⋮ → **安装应用** 或 **添加到主屏幕**

小米 / 华为自带浏览器可能只有「网页快捷方式」、无图标或仍带地址栏，详见 [docs/安卓安装与PWA说明.md](docs/安卓安装与PWA说明.md)。

## 热量公式

- **BMR**（Mifflin-St Jeor）→ **TDEE** = BMR × 活动系数
- **当日缺口**（展示用）= 按分钟累计基础代谢 + 运动 − 饮食
- **运动打卡**：当天有运动记录
- **缺口打卡**：缺口 > 设置阈值（默认 0）

## 技术栈

Vite · React · TypeScript · Tailwind CSS · Node.js API · PostgreSQL · vite-plugin-pwa

## 文档

[docs/README.md](docs/README.md)

<--------------------------------------+----------------+-----------+-----------+-----+--------------------------------------+----------------+-----------+-----------+-----+--------------------------------------+----------------+-----------+-----------+-----+--------------------------------------+----------------+-----------+-----------+-----+--------------------------------------+-------411d-495b-a631-82a73d9d7da2 | q--------------------------------------+----------------+-----------+-----------+-----+--------------------------------------+----------------+-----------+-----------+-----+--------------------------------------+----------------+-----------+-- 80.00 |    178.00 |  26 | male |           1.375 | 1788.00 | 2459.00 |                 0 | t                   | 2026-05-19 15:59:43.466622+08 | 2026-05-19 15:59:43.466622+08 |          | deploy smoke test -->
