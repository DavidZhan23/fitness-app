# 需求管理（GitHub Issues）

用手机或网页 **随手记** 需求；在 Cursor 里 **澄清并实现**。不依赖腾讯文档等第三方。

## 提需求

仓库 → **Issues** → **New issue**：

| 模板 | 用途 |
|------|------|
| Feature request | 新功能、改动想法 |
| Bug report | 缺陷 |

**填写原则**：标题一句话即可；详情、截图均可空。Bug 选「对你影响」、Feature 选「优先级」；说不清的在 Cursor 说「开始 #N」时再澄清。

表单定义：`.github/ISSUE_TEMPLATE/*.yml`（随 `feat/req-intake` 合并进 `main` 后，在 GitHub 新建 Issue 时可见）。

## 看自己的待办

```bash
npm run req:list           # 我提交的、label: status:todo
npm run req:list -- --all  # 我所有 open issue
```

## Issue 状态

| 状态 | 何时 |
|------|------|
| `status:todo` | 新建 issue 后手动添加（可选） |
| `status:doing` | 开工后手动切换（可选） |
| 已关闭 | push 到 `main` 后在 issue 写 `Closes #N` 或手动关闭 |

优先级标签：`priority:high` / `priority:med` / `priority:low`（手动维护）。

- **Bug** — 表单「对你影响」：用不了、数据不对 → `high`；体验差 → `med`；小问题 → `low`
- **Feature** — 表单「优先级」：高 / 中 / 低 → 同上三档

## Cursor 里开工

1. `npm run req:list` 或说「列我的待办」
2. 说「开始 #12」→ 读 issue → 澄清 → 写 `docs/milestones/...` → `bash scripts/new-feature.sh <slug>`
3. 实现 → push 到 `main` 时在 commit/issue 说明里写 `Closes #12`

澄清内容写在 **milestone 文档**，不会自动贴回 issue 正文。

## Owner 一次性配置

labels + Project 看板：[github-project-setup.md](github-project-setup.md)

```bash
bash scripts/setup-req-labels.sh
```

## 相关文档

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — 完整贡献流程
- [ai-playbook.md](../ai-playbook.md) — Cursor 检查清单
- [milestones/M-2026-05-req-intake.md](../milestones/M-2026-05-req-intake.md) — 本能力 milestone
