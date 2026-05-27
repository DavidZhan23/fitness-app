# 健身打卡 — 热量追踪 PWA

记录每日运动与饮食，结合基础代谢计算热量缺口，并以打卡墙展示运动与缺口。

## 参与开发

| 我想… | 读这里 |
|--------|--------|
| 本地跑项目 | [docs/GETTING-START.md](docs/GETTING-START.md) |
| 提需求 / 提交流程 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 用 Cursor 做功能 | [docs/ai-playbook.md](docs/ai-playbook.md) |
| 查全部文档 | [docs/README.md](docs/README.md) |

当前交付模型：本地 `npm run verify` → 直接 push `main` → owner 手动部署。

## 功能

- 邮箱注册 / 登录，数据同步至自托管 API
- 身体资料（生日）→ BMR / TDEE（Mifflin-St Jeor）；设置页自动保存
- 运动、饮食及大卡记录，当日缺口汇总
- 运动 / 饮食快捷模板
- 打卡墙 + 社区动态（总公开随近日记录自动同步；可单独切换「今日公开/隐藏」）；打卡墙支持经典/分屏样式（设置中切换）
- PWA：添加到主屏幕
- AI 辅助每周质量周报（路由耗时 / AI 估算成功率，自动生成 markdown）

## 本地开发（简）

```bash
# 见 docs/GETTING-START.md 完整步骤
brew services start postgresql@16
cd server && npm install && npm run dev    # :3001
npm install && npm run dev                  # :5173，需 .env.local
```

数据库：[docs/ops/本地数据库启停.md](docs/ops/本地数据库启停.md)

## 部署

| 方式 | 文档 |
|------|------|
| 手动上腾讯云 | [docs/ops/腾讯云部署-一步步做.md](docs/ops/腾讯云部署-一步步做.md) |
| 部署说明（当前手动） | [docs/architecture/deploy.md](docs/architecture/deploy.md) |

```bash
cp .env.deploy.example .env.deploy
npm run deploy:tencent        # 仅前端
npm run deploy:tencent:api    # 前端 + API
```

## PWA 安装

[iPhone / Android 说明](docs/ops/安卓安装与PWA说明.md)

## 热量公式

- **BMR** → **TDEE** = BMR × 活动系数
- **当日缺口** = 按分钟基础代谢 + 运动 − 饮食
- **运动打卡**：当天有运动记录
- **缺口打卡**：缺口 > 阈值（默认 0）

## 技术栈

Vite · React · TypeScript · Tailwind · Node.js API · PostgreSQL · vite-plugin-pwa
