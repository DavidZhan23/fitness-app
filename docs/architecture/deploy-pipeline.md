# 部署与 CI/CD 流水线

> 导航：[文档中心](../README.md) · [Owner 自动部署](owner-setup-guide.md) · [主流程图](../assets/diagrams/dev-workflow.svg)

主流程见下图（与 [overview.md](overview.md) 相同风格）：

![开发协作流程](../assets/diagrams/dev-workflow.svg)

## CI Jobs 速查

| Job | 做什么 | 常见失败 | 处理 |
|-----|--------|----------|------|
| lint | `npm run lint` | ESLint 报错 | 本地 `npm run lint` 修复 |
| typecheck | `tsc -b --noEmit` | 类型错误 | 本地 `npm run typecheck` |
| build | `npm run build` | TS/资源错误 | 本地 `npm run build` |
| server-syntax | `node --check` | 语法错误 | 检查 `server/src/*.js` |

## 观察进度

| 角色 | CI（feat/PR） | CD（main merge） |
|------|---------------|------------------|
| Contributor | PR Checks、`gh run watch` | Actions → Deploy |
| Owner | 同左 | Deploy 日志 |

## Deploy Secrets（owner）

| Secret | 用途 |
|--------|------|
| `TENCENT_SSH_KEY` | 部署私钥 |
| `TENCENT_HOST` | 公网 IP |
| `TENCENT_USER` | SSH 用户 |
| `TENCENT_REMOTE_DIR` | 如 `/opt/fitness-app` |

启用：[owner-setup-guide.md](owner-setup-guide.md)。

## 手动部署

```bash
cp .env.deploy.example .env.deploy
npm run deploy:tencent
npm run deploy:tencent:api
```

详见 [ops/腾讯云部署-一步步做.md](../ops/腾讯云部署-一步步做.md)。

## 失败排查

1. **SSH** — Secret、authorized_keys、安全组 22  
2. **docker** — 服务器 `cd /opt/fitness-app/deploy && docker compose ps`  
3. **health** — `curl http://127.0.0.1/api/health`  

## 回滚

`/opt/fitness-app/releases/<sha>/dist` 切换 symlink，见上文 owner 文档。
