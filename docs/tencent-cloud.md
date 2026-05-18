# 腾讯云部署指南（家庭长期使用）

本文说明如何把健身打卡 App 部署到**腾讯云**，数据存在你自己的服务器上，按量/包月付费，支持微信/支付宝充值。

---

## 一、先想清楚：你真的不够吗？

### Supabase 免费版（你现在的方案）

| 资源 | 免费额度 | 家庭 3–10 人估算 |
|------|----------|------------------|
| 数据库 | 500 MB | 几年都难用完 |
| 月活用户 MAU | 50,000 | 完全够 |
| API 请求 | 有限但宽松 | 每天记几笔远远够 |

**结论：** 只有家人几个人用，Supabase 免费版**通常长期够用**。若主要顾虑是「在国外、怕停服、想人民币付费」，再迁到腾讯云。

### 腾讯云自托管（本项目已支持）

| 优点 | 缺点 |
|------|------|
| 数据在国内自己机器 | 要自己维护服务器 |
| 微信/支付宝充值 | 需备案域名（若用国内 HTTPS 域名） |
| 无邮箱验证也可登录 | 要自己备份数据库 |

**推荐配置：** 轻量应用服务器 **2核2G**，约 **50–80 元/月**（新用户常有券）。

---

## 二、架构说明

```
手机浏览器 / 主屏幕 PWA
        ↓ HTTPS（或 HTTP + IP）
腾讯云轻量服务器
  ├── Nginx → 前端静态页 (dist/)
  └── Node API (server/) → PostgreSQL (Docker)
```

每人一个账号（邮箱+密码），数据按用户隔离，和家人各自登录、各自数据——**不是**一个账号里填多个人的名字（若需要「家庭共享视图」以后要另做功能）。

---

## 三、购买腾讯云轻量服务器

1. 打开 [腾讯云轻量应用服务器](https://cloud.tencent.com/product/lighthouse)
2. 地域：选离你家近的（如 **上海 / 广州**）
3. 镜像：**Ubuntu 22.04**
4. 套餐：**2核 2GB** 起即可
5. 购买后记下：**公网 IP**、SSH 密码

安全组放行端口：**22**（SSH）、**80**（HTTP）、**443**（HTTPS，可选）

---

## 四、服务器上安装 Docker

SSH 登录：

```bash
ssh root@你的公网IP
```

安装 Docker（官方脚本）：

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

安装 Docker Compose 插件：

```bash
apt update && apt install -y docker-compose-plugin git
```

---

## 五、上传代码并配置

### 方式 A：Git 克隆（推荐）

```bash
cd /opt
git clone 你的仓库地址 fitness-app
cd fitness-app/deploy
cp .env.example .env
nano .env   # 修改密码和密钥
```

`.env` 示例：

```env
POSTGRES_PASSWORD=你的强密码至少16位
JWT_SECRET=随机字符串至少32位
CORS_ORIGIN=http://你的公网IP,https://你的域名.com
```

### 方式 B：本机打包上传

在本机 Mac 上：

```bash
cd "/Users/davidzhan/Desktop/健身APP"
npm run build
# 用 scp 把整个项目传到服务器
scp -r . root@你的IP:/opt/fitness-app
```

---

## 六、构建前端（指向你的 API）

在**本机**构建前，创建生产环境变量文件 `.env.production.local`：

```env
VITE_BACKEND=selfhosted
# 若用 Nginx 反代（见下）：带 /api
VITE_API_URL=http://你的公网IP/api
# 若暂时只暴露 3001 端口测试：
# VITE_API_URL=http://你的公网IP:3001
```

然后：

```bash
npm run build
```

把 `dist/` 目录确保在服务器上（docker-compose 会挂载 `../dist`）。

---

## 七、启动服务

```bash
cd /opt/fitness-app/deploy
docker compose up -d --build
```

检查：

```bash
docker compose ps
curl http://127.0.0.1:3001/health
```

浏览器访问：`http://你的公网IP`（80 端口，Nginx 提供网页 + `/api` 反代）。

---

## 八、给家人注册账号

1. 每人打开 `http://你的IP`（或绑定域名后的网址）
2. **注册** → 填自己的邮箱和密码（**无需**邮件验证）
3. 完善身体资料 → 开始记录

管理员可在服务器查看数据库（可选）：

```bash
docker compose exec postgres psql -U fitness -d fitness -c "select email from users;"
```

---

## 九、HTTPS 与域名（可选但推荐）

1. 在腾讯云购买域名并完成 **ICP 备案**（国内服务器对外提供网站需要）
2. 域名解析到轻量服务器 IP
3. 使用 **Let’s Encrypt** 或腾讯云免费 SSL 证书
4. 修改 Nginx 监听 443，并把 `CORS_ORIGIN`、`VITE_API_URL` 改为 `https://你的域名.com/api`

手机「添加到主屏幕」在 HTTPS 下体验更好。

---

## 十、备份（重要）

数据库在 Docker volume `pgdata` 里，建议每周备份：

```bash
docker compose exec postgres pg_dump -U fitness fitness > backup_$(date +%F).sql
```

下载到本机：

```bash
scp root@你的IP:/opt/fitness-app/deploy/backup_2026-05-18.sql ./
```

---

## 十一、本地开发（自托管模式联调）

终端 1 — API + 数据库：

```bash
cd deploy
docker compose up postgres api
```

终端 2 — 前端：

```bash
# .env.local
VITE_BACKEND=selfhosted
VITE_API_URL=http://localhost:3001

npm run dev
```

注意：本地开发 API **不带** `/api` 前缀；只有 Nginx 生产环境才用 `/api` 反代。

---

## 十二、从 Supabase 迁到腾讯云

1. 在腾讯云按上文部署好自托管环境  
2. 家人**重新注册**账号（最简单）  
3. 若必须迁旧数据：从 Supabase Table Editor 导出 CSV，再写脚本导入 `users` / `profiles` / `day_logs` 等（需单独处理密码，建议家人重置密码）

---

## 十三、费用粗算

| 项目 | 约费用 |
|------|--------|
| 轻量 2C2G | 50–80 元/月 |
| 域名 | 约 50 元/年 |
| 流量 | 家庭使用通常可忽略 |

比 Supabase Pro（约 $25/月）对「只要国内、要可控」的用户更直观。

---

## 十四、常见问题

**Q：能否不备案只用 IP 访问？**  
可以 HTTP + IP 给家里人用；HTTPS 自定义域名在国内一般需要备案。

**Q：和 Supabase 能同时用吗？**  
可以。`.env.local` 不设 `VITE_BACKEND=selfhosted` 时仍走 Supabase；设了则走自己的 API。

**Q：2G 内存够吗？**  
家庭几人够用。若同时跑很多服务，可升到 4G。

---

需要帮助时，说明：是否已买服务器、能否 SSH 登录、`docker compose ps` 的输出。
