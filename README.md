# 健身打卡 — 热量追踪 PWA

记录每日运动与饮食，结合基础代谢计算热量缺口，并以打卡墙展示运动与缺口。

## 功能

- 邮箱注册 / 登录，数据同步至自托管 API
- 身体资料 → 自动计算 BMR / TDEE（Mifflin-St Jeor）
- 记录运动、饮食及大卡，自动汇总当日缺口
- 运动 / 饮食快捷模板
- 打卡墙 + 社区公开动态
- PWA：手机浏览器「添加到主屏幕」即可像 App 使用

## 本地开发

**开启 / 关闭前端、后端、数据库：** 见 [docs/本地开发-启停服务.md](docs/本地开发-启停服务.md)。

### 1. 启动数据库与 API

```bash
cd deploy && docker compose up -d   # 或连接已有 PostgreSQL
cd ../server && npm install && npm run dev
```

`server` 需配置 `DATABASE_URL` 等，见 `deploy/.env.example`。

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

**一步步指南：** [docs/腾讯云部署-一步步做.md](docs/腾讯云部署-一步步做.md)

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
