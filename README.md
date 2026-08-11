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

- 邮箱注册 / 登录 / 邮件找回密码，数据同步至自托管 API
- 身体资料（生日）→ BMR / TDEE（Mifflin-St Jeor）；可选择基础代谢全天计入或随时间累计
- 运动、饮食及大卡记录；饮食可选填蛋白质、脂肪、碳水和糖，空项保存时由 AI 尝试补全
- 今日页为个人主页（可选日查看/补记），下方挂打卡墙；底栏「今日 / 社区 / 营养」
- 每日营养页支持历史日期、旧餐食一次性后台补全、主题化宏量饼图与逐餐明细；建议可切换较高油糖 / 正常油糖 / 少油少糖（后者脂肪与糖各 30g），AI 短建议仅在主动重新评估时调用
- 本周达成运动大王后，今日页解锁“小狸”陪伴舞台；支持单击 AI 鼓励、双击夸奖、长按运动建议与本地兜底
- 每周一懒生成上一自然周的“小满周报”，含运动、饮食、热量缺口、成就墙、小狸点评、下周建议、未读提醒与历史回顾
- 运动 / 饮食快捷模板
- 设置中可切换 12 套主题风格，包含可关闭主视觉的“超蝙对决”红黑宣纸联名皮肤
- 打卡墙（在今日页）+ 社区动态（总公开随近日记录自动同步；开发者隐藏锁优先且不会被重启/打卡恢复；可单独切换「今日公开/隐藏」）；打卡墙支持经典/分屏样式（设置中切换）
- 主题皮肤与联名主视觉开关同时保存到本机和账号，刷新、重登及跨设备可恢复
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
