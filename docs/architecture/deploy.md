# 手动部署说明

> 导航：[文档中心](../README.md) · [运维总览](../ops/README.md)

**本仓库当前没有自动部署。**  
merge 到 `main` 不会触发任何 GitHub Actions 流水线。

## 当前交付模型

1. 开发者本地执行 `npm run verify`
2. 通过后直接 push 到 `main`
3. owner 在本地手动执行部署脚本

## 手动部署命令（owner）

```bash
cp .env.deploy.example .env.deploy
npm run deploy:tencent
npm run deploy:tencent:api
```

详细步骤见 [ops/腾讯云部署-一步步做.md](../ops/腾讯云部署-一步步做.md)。

## 失败排查

1. **SSH 连接**：检查安全组、IP、密钥
2. **容器状态**：`cd /opt/fitness-app/deploy && docker compose ps`
3. **健康检查**：`curl http://127.0.0.1/api/health`
4. **前端未更新**：确认 `/opt/fitness-app/dist` 是软链接而不是实体目录

## 回滚

切换到上一个可用发布目录的软链接后重启 web：

```bash
ssh root@<IP> "ln -sfn /opt/fitness-app/releases/<sha>/dist /opt/fitness-app/dist"
cd /opt/fitness-app/deploy && docker compose up -d web
```

## 未来恢复 CI/CD（可选）

若将来恢复自动化，参考 `.github/workflows.disabled/README.md`，按需把归档 workflow 移回 `.github/workflows/` 并补齐仓库配置。
