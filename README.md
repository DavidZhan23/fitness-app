# 健身打卡 — 热量追踪 PWA

面向家庭 / 熟人小圈子的健身打卡与热量账本。记录每日运动与饮食，按身体资料计算 BMR / TDEE 与当日热量缺口，在今日页展示打卡墙，并在社区里分享动态。

**仓库：** [DavidZhan23/fitness-app](https://github.com/DavidZhan23/fitness-app)（公开）  
**版本：** 见根目录 `package.json`（当前 `1.5.x`）

---

## 目录

1. [产品是什么](#产品是什么)
2. [核心概念](#核心概念)
3. [功能一览](#功能一览)
4. [技术栈与架构](#技术栈与架构)
5. [仓库结构](#仓库结构)
6. [本地快速开始](#本地快速开始)
7. [开发与协作](#开发与协作)
8. [质量门禁](#质量门禁)
9. [部署与 PWA](#部署与-pwa)
10. [文档导航](#文档导航)

---

## 产品是什么

| 维度 | 说明 |
|------|------|
| **主轴** | **本人当日热量账本**：注册 → 身体资料 → 记运动/饮食 → 算出当日缺口 → 打卡墙 |
| **增强** | 社区互动、AI 估算/建议、小狸陪伴、用户周报 —— 都挂在日账本上，不与记账平级 |
| **用户边界** | 熟人小圈子；注册需 `REGISTRATION_KEY`；社区不做陌生人发现 / 推荐 / 公开放大 |
| **形态** | 可安装的 Progressive Web App（添加到主屏幕） |

底栏主入口：**今日** · **社区** · **营养**。今日页同时是个人主页：上方热量结果，下方挂打卡墙。

---

## 核心概念

### 热量账本

```text
当日缺口 ≈ 按分钟计入的基础代谢 + 运动消耗 − 饮食摄入
```

| 概念 | 含义 |
|------|------|
| **BMR** | 基础代谢（Mifflin-St Jeor，由生日等身体资料推导） |
| **TDEE** | BMR × 活动系数 |
| **代谢计入方式** | 可设「全天一次计入」或「随时间累计」（分钟级） |
| **运动打卡** | 当天有运动记录 |
| **缺口打卡** | 当日缺口大于阈值（默认 0） |

公式长期目标为共享包一份源码（`packages/calories`，见 [ADR-0008](docs/decisions/0008-shared-calories-package.md)）。搬迁前前后端各有一份实现，**改公式必须两端一起改**。

### 「一天」的边界（勿混用）

| 用途 | 时区 / 日历 |
|------|-------------|
| 记账、今日页、打卡墙 | **浏览器本地日历日** |
| AI 配额、周报、狐狸周等 | **`DISPLAY_TIMEZONE`（默认 Asia/Shanghai）** |

详见 [ADR-0004](docs/decisions/0004-date-tz-strategy.md)。

---

## 功能一览

### 账号与资料

- 邮箱注册 / 登录；邮件找回密码
- 身体资料（含生日）→ BMR / TDEE；可选基础代谢计入方式
- 数据同步至自托管 API（JWT）

### 记账（今日 / 记录页）

- 运动、饮食及大卡记录；可选日查看与补记
- 饮食可填蛋白质、脂肪、碳水、糖；空项保存时可由 AI 尝试补全
- 运动 / 饮食快捷模板
- AI 文本估算 kcal；饮食支持拍照识卡路里（有每日额度）

### 今日页与打卡墙

- 个人主页 + 当日热量结果文案
- 下方打卡墙：经典 / 分屏样式（设置中切换）
- 本周达成「运动大王」后解锁「小狸」陪伴舞台（单击鼓励、双击夸奖、长按运动建议，含本地兜底）

### 营养

- 每日营养页：历史日期、宏量饼图、逐餐明细
- 建议可切换：较高油糖 / 正常油糖 / 少油少糖（后者脂肪与糖各 30g）
- AI 短建议仅在主动「重新评估」时调用
- 旧餐食可一次性后台补全宏量

### 社区

- 成员动态、关注、点赞、评论、条目赞踩、互动消息 inbox
- **总公开**：近日有记录可自动打开；开发者隐藏锁优先，不会被重启/打卡自动恢复
- **当日公开/隐藏**：可单独切换某一天是否对他人可见
- 开发者后台可管理社区名片可见性

### 周报与主题

- 每周一懒生成上一自然周「小满周报」：运动、饮食、缺口、成就墙、小狸点评、下周建议、未读提醒与历史回顾
- 设置中可切换 **12** 套主题（含可关闭主视觉的「超蝙对决」等联名皮肤）
- 主题与联名主视觉开关双写本机 + 账号，刷新、重登、跨设备可恢复

### PWA 与运维侧

- 可添加到主屏幕（iPhone / Android 说明见运维文档）
- 开发者质量周报（路由耗时 / AI 估算成功率等，自动生成 markdown）

---

## 技术栈与架构

```text
浏览器 PWA (Vite :5173)
        │  VITE_API_URL / 生产相对路径 /api
        ▼
   Express API (:3001)
        │
        ▼
   PostgreSQL 16
```

| 层 | 技术 |
|----|------|
| 前端 | Vite 8 · React 19 · TypeScript · Tailwind 4 · vite-plugin-pwa · React Router |
| 后端 | Node.js Express（ESM）· JWT · DeepSeek（AI） |
| 数据库 | PostgreSQL 16（本地 Homebrew；生产 Docker，见 `deploy/`） |
| 生产 | 腾讯云 · Nginx → API · **手动部署**（无自动 CD） |

更完整的系统说明、表结构与社区可见性规则：[docs/architecture/overview.md](docs/architecture/overview.md)。  
HTTP 契约：[docs/architecture/api-contract.md](docs/architecture/api-contract.md)。

---

## 仓库结构

| 路径 | 用途 |
|------|------|
| `src/pages/` · `src/components/` · `src/lib/` | React UI 与客户端逻辑 |
| `src/context/` · `src/hooks/` | Auth、主题、社区 inbox 等 |
| `server/src/` | Express API（入口 `index.js`） |
| `server/migrations/` | Schema，按文件名顺序执行 |
| `e2e/` | Playwright 端到端测试 |
| `deploy/` | 生产 docker-compose + nginx |
| `scripts/` | verify、部署、new-feature、QA seed 等 |
| `docs/` | 文档中心（入门、架构、运维、milestone、ADR） |
| `.cursor/rules/` · `.cursor/skills/` | Cursor Agent 规则与技能 |

复用优先表（禁止平行实现 BMR/TDEE/`toKcal`/dateKey 等）：见 `.cursor/rules/06-reuse-first.mdc` 与 [AGENTS.md](AGENTS.md)。

---

## 本地快速开始

完整步骤与排错：[docs/GETTING-START.md](docs/GETTING-START.md)。数据库启停：[docs/ops/本地数据库启停.md](docs/ops/本地数据库启停.md)。

**前置：** Node.js 22+ · PostgreSQL 16 ·（可选）GitHub CLI、Cursor。

```bash
git clone https://github.com/DavidZhan23/fitness-app.git
cd fitness-app
npm install
cd server && npm install && cd ..

cp .env.example .env.local          # VITE_API_URL=http://localhost:3001
cp server/.env.example server/.env  # DATABASE_URL / JWT_SECRET / REGISTRATION_KEY 必填

brew services start postgresql@16
createdb fitness                    # 若尚未创建；migration 见入门文档

# 终端 A
cd server && npm run dev            # http://localhost:3001  ·  curl /health → {"ok":true}

# 终端 B
npm run dev                         # http://localhost:5173
```

> 本地直连 `3001` **不带** `/api` 前缀；`/api` 仅生产 Nginx 反代使用。

---

## 开发与协作

当前交付闭环（与旧文档「直接 push main」不同）：

```text
提需求 → grill-me 确认 → 实现 → persona-ui-test（UI）→ npm run verify
  → commit / push：dev/huanghongli → PR → main → owner 手动部署
```

| 我想… | 去哪里 |
|--------|--------|
| 本地跑起来 | [docs/GETTING-START.md](docs/GETTING-START.md) |
| 提需求 / Issue | [CONTRIBUTING.md](CONTRIBUTING.md) · [docs/requirements/](docs/requirements/) · `npm run req:list` |
| 用 Cursor 做功能 | [docs/ai-playbook.md](docs/ai-playbook.md) · `bash scripts/dev-loop.sh` |
| 开新功能分支骨架 | `bash scripts/new-feature.sh <slug>`（默认同步到 `dev/huanghongli`） |
| 查全部文档 | [docs/README.md](docs/README.md) |

- **默认工作分支：** `dev/huanghongli` → 开 / 更新 **一个** PR 到 `main`（一般不按功能再开 `feat/<slug>`，除非明确要求）
- **Commit：** [Conventional Commits](https://conventionalcommits.org/)（`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`）
- **合并 main 后：** owner 手动执行部署（见下节）；**没有** GitHub Actions 自动部署

---

## 质量门禁

```bash
npm run verify
# docs-only 可跳过 e2e：
bash scripts/verify-local.sh --skip-e2e
```

`verify` 串联：lint · typecheck · unit · e2e · server 语法 · 规则守卫。

| 命令 | 说明 |
|------|------|
| `npm run test` | Vitest 单测 |
| `npm run test:e2e` | Playwright（需本机 `fitness` 库；详见入门 §5） |
| `npm run cleanup:qa-seed` | PR 前提交前清理 QA 种子账号（若本轮跑过 e2e/seed） |
| `npm run check:mobile-layout` 等 | 布局专项，不进默认 verify |

E2E / QA 种子细则：[docs/ops/qa-manual-seed.md](docs/ops/qa-manual-seed.md)。

---

## 部署与 PWA

**当前没有自动部署。** merge 到 `main` 不会触发上线流水线。

| 方式 | 文档 |
|------|------|
| 手动上腾讯云（一步步） | [docs/ops/腾讯云部署-一步步做.md](docs/ops/腾讯云部署-一步步做.md) |
| 部署模型与回滚 | [docs/architecture/deploy.md](docs/architecture/deploy.md) |
| 同机 Nginx 共存 | [docs/ops/同机多应用-nginx共存.md](docs/ops/同机多应用-nginx共存.md) |
| iPhone / Android 安装 | [docs/ops/安卓安装与PWA说明.md](docs/ops/安卓安装与PWA说明.md) |

```bash
cp .env.deploy.example .env.deploy
npm run deploy:tencent        # 仅前端
npm run deploy:tencent:api    # 前端 + API
```

---

## 文档导航

| 文档 | 何时读 |
|------|--------|
| [docs/README.md](docs/README.md) | 文档中心总索引（必读 vs 按需） |
| [docs/GETTING-START.md](docs/GETTING-START.md) | 第一次把项目跑起来 |
| [docs/ai-playbook.md](docs/ai-playbook.md) | Cursor 开发闭环与 skills |
| [docs/architecture/overview.md](docs/architecture/overview.md) | 系统主轴、表、社区可见性 |
| [docs/architecture/api-contract.md](docs/architecture/api-contract.md) | 改 API 前先看 TL;DR |
| [docs/architecture/deploy.md](docs/architecture/deploy.md) | 手动部署与回滚 |
| [docs/ops/README.md](docs/ops/README.md) | DB / 腾讯云 / PWA / QA 等运维 |
| [docs/milestones/](docs/milestones/) | 进行中 / 历史功能规格 |
| [docs/decisions/](docs/decisions/) | 架构决策 ADR |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献与提交流程 |
| [AGENTS.md](AGENTS.md) | Coding agent 短指针 |

---

维护者：**@DavidZhan23**。合并到 `main` 后请记得手动部署。
