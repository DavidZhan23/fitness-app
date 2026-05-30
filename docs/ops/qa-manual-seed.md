# QA 手动验收种子（本地）

E2E 结束后向固定账号 **jerryuk1019@163.com** 注入社区互动数据，便于在真机/浏览器上点验 inbox、关注者、用户页评论等。提交 PR 前删除临时测试号。

## 安全限制

- 脚本只连接 **`localhost` / `127.0.0.1`** 且库名为 **`fitness`** 的 `DATABASE_URL`
- **不会**连接生产或远程数据库
- **不会**创建或删除 jerry 账号

## 固定临时用户

| 邮箱 | 用途 |
|------|------|
| `qa-seed+fan-a@example.com` | 关注 jerry、发表评论 |
| `qa-seed+fan-b@example.com` | 点赞 jerry 今日、评论赞/踩 |

本地密码（仅开发机）：`qa-seed-pass-123456` — **勿提交到仓库日志**

评论、昵称、控制台摘要均带 **`QA_SEED_FEATURE`** 前缀（默认 `manual`）：

```bash
QA_SEED_FEATURE=community-inbox npm run seed:qa-manual
```

## 何时自动执行

| 时机 | 行为 |
|------|------|
| `npm run test:e2e` 结束 | `global-teardown` → `cleanup:e2e-users` → **`seed:qa-manual`** |
| `npm run verify` | 含 e2e，同上（**不会**在 verify-local.sh 里二次 seed） |

跳过自动 seed：

```bash
PW_SKIP_QA_SEED=1 npm run test:e2e
```

## jerry 账号不存在

若本地库没有 `jerryuk1019@163.com`，seed 会 **警告并 exit 0**，verify 仍可通过。请先在本机注册该账号后再跑 seed。

## 手动验收清单

1. 登录 **jerryuk1019@163.com**
2. **社区** → **查看互动消息**
3. 社区 **关注者** / 用户页 **今日评论**（`#day-comments`）
4. 确认文案含 `[manual]` 或当前 `QA_SEED_FEATURE` 前缀

## PR 前必做

```bash
npm run cleanup:qa-seed
```

删除 `qa-seed+*` 用户；jerry 保留。

## 手动命令

```bash
npm run seed:qa-manual      # 幂等：先 cleanup 再注入
npm run cleanup:qa-seed       # 仅删除 qa-seed 用户
```
