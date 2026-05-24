# Owner：启用 GitHub Actions 自动部署

面向仓库管理员 **@DavidZhan23**。Contributor 的流水线在 PR merge 处结束；本文说明 merge 后如何自动部署到腾讯云。

**不想读文档？** 在 Cursor 打开本项目，说：「帮我配自动部署」。Rule `05-owner-cd-setup` 会逐步引导。

## 前提

- 服务器已能手动部署（见 [腾讯云部署-一步步做.md](../ops/腾讯云部署-一步步做.md)）
- `/opt/fitness-app` 已有代码与 `deploy/docker compose` 可运行

## 步骤 1：生成部署专用 SSH 密钥

在**你的 Mac**（不要复用个人默认密钥）：

```bash
ssh-keygen -t ed25519 -f ~/.ssh/fitness-app-deploy -N ""
cat ~/.ssh/fitness-app-deploy.pub
```

将输出的公钥追加到服务器：

```bash
ssh root@<你的公网IP> "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys" < ~/.ssh/fitness-app-deploy.pub
```

## 步骤 2：服务器目录

```bash
ssh root@<IP> "mkdir -p /opt/fitness-app/releases"
```

## 步骤 3：GitHub Secrets

仓库 → **Settings** → **Secrets and variables** → **Actions** → New repository secret：

| Name | Value |
|------|--------|
| `TENCENT_SSH_KEY` | `~/.ssh/fitness-app-deploy` 私钥全文 |
| `TENCENT_HOST` | 公网 IP |
| `TENCENT_USER` | `root` |
| `TENCENT_REMOTE_DIR` | `/opt/fitness-app` |

验证：`gh secret list`（需 repo admin）。

## 步骤 4：启用 workflow

```bash
cp .github/workflows/deploy.yml.template .github/workflows/deploy.yml
git add .github/workflows/deploy.yml
git commit -m "chore: enable deploy workflow on merge to main"
git push
```

（也可通过 PR 合并。）

## 步骤 5：验证闭环

1. 合并任意小改动到 `main`
2. Actions → **Deploy** → 等待绿色
3. `curl http://<IP>/api/health` → `{"ok":true,...}`

## 安全提醒

- 勿将私钥提交进 Git
- 曾在聊天/截图暴露的 Key 建议在 DeepSeek/SSH 侧轮换
- `deploy/.env` 仅存在于服务器，不进仓库

## 给 Contributor 的 branch protection（建议同步配置）

Settings → Branches → `main`：

- Require pull request
- Require 1 approval + Code Owners
- Require status checks: CI jobs
- Do not allow bypass

详见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。
