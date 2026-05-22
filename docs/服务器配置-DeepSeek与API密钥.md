# 服务器配置 DeepSeek API Key（原理 + 逐步操作）

本文说明：**API Key 存在哪、为什么不走「上传文件」、Docker 怎么读到、你如何验收**。  
适合已按 [腾讯云部署-一步步做.md](./腾讯云部署-一步步做.md) 装好 Docker 的情况。

---

## 先建立整体图景

```text
你的 iPhone / 电脑浏览器
        │
        ▼  只访问 http://公网IP（前端页面）
   ┌─────────┐
   │  web    │  Nginx 容器：静态文件 dist/
   └────┬────┘
        │  /api/* 转发
        ▼
   ┌─────────┐
   │  api    │  Node 容器：读环境变量 DEEPSEEK_API_KEY
   └────┬────┘     调用 https://api.deepseek.com
        │
   ┌────┴────┐
   │ postgres │  数据库
   └──────────┘
```

| 层级 | 放什么 | 原理 |
|------|--------|------|
| 浏览器 / `.env.local` | 只有 `VITE_API_URL` | 前端**不能**拿 DeepSeek Key，否则任何人 F12 都能看到 |
| 本机 `server/.env` | 本地开发用的 Key | 只有本机 `npm run dev` 时 Node 进程读取 |
| 服务器 `deploy/.env` | 线上用的 Key | `docker compose` 启动 **api 容器** 时注入为环境变量 |
| DeepSeek 云端 | 真正算千卡 | api 容器用 Key 代你请求，用户永远接触不到 Key |

**重要：** `npm run deploy:tencent:api` 会上传 **代码**，但**不会**上传你 Mac 上的 `server/.env`（脚本里排除了）。  
所以 Key 必须在**服务器上**单独写进 `deploy/.env`，不是「上传一个 key 文件」。

---

## 一、本地开发（Mac）写 Key

### 文件位置

```text
健身APP/server/.env
```

### 操作

```bash
cd /Users/davidzhan/Desktop/健身APP/server
cp .env.example .env   # 若已有 .env 可跳过
```

在 `server/.env` 增加：

```env
DEEPSEEK_API_KEY=sk-你的密钥
```

### 原理

- `dotenv` 在 API 启动时加载 `server/.env` 到 `process.env`。
- `deepseekKcal.js` 读 `process.env.DEEPSEEK_API_KEY` 去请求 DeepSeek。
- 改 `.env` 后必须**重启** `npm run dev`，否则旧进程没有新变量。

### 验收

1. 终端 1：`cd server && npm run dev`，看到 `API listening on http://0.0.0.0:3001`  
2. 终端 2：项目根目录 `npm run dev`  
3. 浏览器打开记运动 → 填描述 →「AI 估算 kcal」→ 应出现数字  

---

## 二、服务器上配置 Key（核心）

以下在 **腾讯云服务器** 上操作（SSH），默认项目目录 `/opt/fitness-app`。

### 步骤 1：登录服务器

**命令：**

```bash
ssh root@你的公网IP
```

**原理：** 获得一台远程 Linux 的 shell，后续编辑的文件都在**服务器磁盘**上，与你 Mac 上的 `server/.env` 无关。

---

### 步骤 2：找到 deploy 目录

**命令：**

```bash
cd /opt/fitness-app/deploy
ls -la
```

应能看到 `docker-compose.yml`、`.env` 或 `.env.example`。

**原理：** 所有容器（postgres / api / web）由这里的 `docker compose` 定义；环境变量从同目录的 `.env` 文件注入。

---

### 步骤 3：编辑服务器上的 `deploy/.env`

**若没有 `.env`：**

```bash
cp .env.example .env
vi .env
```

**在已有 `.env` 上：**

```bash
vi .env
```

> OpenCloudOS / CentOS 等常未安装 `nano`，用系统自带的 **`vi`** 即可。  
> 若要用 nano：`dnf install -y nano`（需 root）。

**`vi` 最简用法：** 按 `i` 进入编辑 → 改完按 `Esc` → 输入 `:wq` 回车保存退出（不保存用 `:q!`）。

**在文件中加入或修改（示例）：**

```env
POSTGRES_PASSWORD=你的数据库强密码
JWT_SECRET=你的至少32位随机串
REGISTRATION_KEY=454676
CORS_ORIGIN=http://你的公网IP

DEEPSEEK_API_KEY=sk-你的密钥
```

注意：

- `CORS_ORIGIN` 不要末尾斜杠，须与浏览器地址栏一致（`http://IP`）。  
- **不要**把 Key 写进 `server/.env` 就指望部署脚本带上去——脚本故意不传 `.env`。

保存：`Ctrl+O` 回车，`Ctrl+X`。

**原理：**

- Docker Compose 语法 `DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:-}` 表示：从 **宿主机** `deploy/.env` 读取变量，传给 **api 容器** 内的环境变量。  
- 容器内的 Node 与本地一样读 `process.env.DEEPSEEK_API_KEY`。  
- 文件在服务器上，不进入 Git，也不打进前端 dist。

---

### 步骤 4：重建 api 容器（让新环境变量生效）

**命令：**

```bash
cd /opt/fitness-app/deploy
docker compose up -d --build api
```

**原理：**

- 仅改 `.env` 而不重建/重启容器时，**正在运行的** api 进程仍可能是旧环境变量。  
- `up -d --build api`：用最新 `server/` 代码构建镜像（若代码有变），并**重新创建** api 容器，启动时注入新的 `.env`。  
- `postgres`、`web` 可不动；只改 Key 时重建 api 即可。

---

### 步骤 5：确认 Key 已进容器（必做）

```bash
docker compose exec api printenv DEEPSEEK_API_KEY
```

有 `sk-` 开头输出即成功（勿在公共场合截图）。**若为空**：说明服务器上的 `docker-compose.yml` 太旧，未把 `.env` 注入 api——在 Mac 执行 `npm run deploy:tencent:api`（会同步最新 compose）后再重建。

```bash
curl -s http://127.0.0.1/api/health
```

应含 `"aiConfigured":true`。若为 `false`，Key 仍未进容器。

**原理：** `exec` 在**运行中的** api 容器里执行命令，看到的是容器内真实环境变量，不是宿主机文件。

---

### 步骤 6：确认 API 健康

```bash
curl -s http://127.0.0.1:3001/health
```

应返回 `{"ok":true}`。

通过 Nginx 时：

```bash
curl -s http://127.0.0.1/api/health
```

**原理：** web 容器把 `/api` 反代到 api 容器的 3001 端口；手机访问的是 `http://公网IP/api/...`。

---

### 步骤 7：手机 / 浏览器验收 AI

1. 打开 `http://你的公网IP`（或已安装的主屏幕 PWA）  
2. 登录 → 记运动或记饮食  
3. 使用「AI 估算热量」  

若提示「AI 估算未配置」→ 容器未读到 Key，回到步骤 3–4。  
若提示「无法连接 AI 服务」→ Key 无效、网络或 DeepSeek 账户问题。

---

## 三、从 Mac 更新代码时和 Key 的关系

### 本机 `.env.deploy`（仅 SSH 部署用）

```bash
cp .env.deploy.example .env.deploy
# 只填 SERVER_IP、SSH_USER 等，不要填 DEEPSEEK_API_KEY
```

**原理：** `.env.deploy` 只给 `deploy-tencent.sh` 知道往哪台机器 `scp`/`rsync`，与 api 运行时环境无关。

### 更新前端 + 后端

```bash
npm run deploy:tencent:api
```

**脚本做了什么：**

| 动作 | 原理 |
|------|------|
| 构建 `dist/` | 前端静态资源 |
| `scp dist` 到服务器 | 覆盖 `/opt/fitness-app/dist`，Nginx 立即用新页面 |
| `rsync server/`（排除 `.env`） | 只传代码，**不传** Mac 上的密钥 |
| SSH 执行 `docker compose up -d --build api` | 用新代码重建 api 容器 |

**Key 仍在服务器 `deploy/.env` 里**，除非你 SSH 上去改过，否则一次配置长期有效。

若你只改了前端，可：

```bash
npm run deploy:tencent
```

不必重建 api，**也不影响** DeepSeek Key。

---

## 四、常见问题

### Q：能不能用 scp 把 `server/.env` 传到服务器？

可以，但不推荐把本机 `.env` 整个覆盖上去（可能含本地 `DATABASE_URL=localhost`）。  
更稳妥：只在服务器 `nano deploy/.env` 加一行 `DEEPSEEK_API_KEY`。

若坚持复制，需单独维护服务器专用 env，勿混用本地数据库地址。

### Q：Key 会进 Git 吗？

`server/.env`、`.env.deploy` 已在 `.gitignore`。  
`deploy/.env` 在服务器上，不在仓库里。  
切勿把 Key 提交进 `deploy/.env.example`（示例文件应为空）。

### Q：为什么要重建 api 而不是 restart？

`docker compose restart api` 有时仍沿用旧环境；`up -d --build api` 确保新 env + 新代码。  
仅改 Key 时：`docker compose up -d --force-recreate api` 也可。

### Q：本地好了、线上不行？

对照检查：

1. 服务器 `deploy/.env` 是否有 `DEEPSEEK_API_KEY=`  
2. `docker compose exec api printenv DEEPSEEK_API_KEY` 是否有值  
3. `CORS_ORIGIN` 是否与访问地址一致  
4. 服务器能否访问外网（DeepSeek API）：`curl -I https://api.deepseek.com`  

---

## 五、安全建议

- Key 只在 **server/.env（本机）** 和 **deploy/.env（服务器）** 两处。  
- 曾在聊天、截图里暴露过的 Key 建议在 DeepSeek 控制台**轮换**。  
- 不要将 Key 写入前端、README 或示例 `.env.example` 的真实值。
