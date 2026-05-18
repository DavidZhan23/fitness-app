# 健身打卡 — 热量追踪 PWA

记录每日运动与饮食，结合基础代谢计算热量缺口，并以 GitHub 风格热力图展示运动与缺口打卡。

## 功能

- 邮箱注册 / 登录，数据云端同步（Supabase）
- 身体资料 → 自动计算 BMR / TDEE（Mifflin-St Jeor）
- 记录运动、饮食及大卡，自动汇总当日缺口
- 运动 / 饮食快捷模板
- 双轨打卡热力图（过去 84 天）+ 连续天数
- PWA：手机浏览器「添加到主屏幕」即可像 App 使用

## 本地开发

### 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 新建项目
2. 在 **SQL Editor** 中执行 [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
3. **Authentication → Providers** 开启 Email  
4. **Authentication → Sign In / Providers → Email** 关闭 **Confirm email**（本地测试强烈建议，否则须先点邮件链接才能登录）
5. **Settings → API** 复制：
   - **Project URL**（形如 `https://xxxxx.supabase.co`，**不要**复制带 `/rest/v1/` 的地址）
   - **anon public** key（通常以 `eyJ` 开头的长字符串）

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 填入 Supabase URL 与 anon key。

### 3. 启动

```bash
npm install
npm run dev
```

浏览器访问终端显示的地址（默认 `http://localhost:5173`）。

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 [vercel.com](https://vercel.com) Import 该仓库
3. 在 Vercel 项目 **Settings → Environment Variables** 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 部署完成后用手机打开 `https://你的域名.vercel.app`

## 添加到手机主屏幕

**iPhone（Safari）**：分享 → **添加到主屏幕**

**Android（Chrome）**：菜单 → **安装应用** 或 **添加到主屏幕**

## 热量公式

- **BMR**（Mifflin-St Jeor）→ **TDEE** = BMR × 活动系数
- **当日缺口** = TDEE + 运动消耗 − 饮食摄入
- **运动打卡**：当天有运动记录
- **缺口打卡**：缺口 > 设置阈值（默认 0）

## 部署到腾讯云（前端 + 后端同机）

**跟着一步步做：** **[docs/腾讯云部署-一步步做.md](docs/腾讯云部署-一步步做.md)**  

Mac 上一键更新服务器（需已配置 `.env.deploy`）：

```bash
cp .env.deploy.example .env.deploy   # 首次：填写 SERVER_IP
npm run deploy:tencent               # 仅更新前端
npm run deploy:tencent:api           # 前端 + 后端
```

服务器上启动：`cd deploy && docker compose up -d --build`  

更多细节见 [docs/tencent-cloud.md](docs/tencent-cloud.md)。

## 技术栈

Vite · React · TypeScript · Tailwind CSS · Supabase 或自托管 API · vite-plugin-pwa
