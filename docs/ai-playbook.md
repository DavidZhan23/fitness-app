# AI 协作手册（Cursor + 本项目）

给 **Cursor Agent** 与使用 Cursor 的开发者：按本页和 `.cursor/rules/` 协作，目标是稳定交付、避免范围失控。

## 读文档顺序（新功能）

| 顺序 | 文件 | 何时读 |
|------|------|--------|
| 1 | 用户提到的 GitHub Issue（`gh issue view N`） | 从「开始 #N」接手时 |
| 2 | `docs/milestones/<slug>.md` 或 [_TEMPLATE.md](milestones/_TEMPLATE.md) | 规划与实现全程 |
| 3 | `docs/architecture/api-contract.md` | 动 API 时 |
| 4 | `docs/architecture/overview.md` | 不确定表结构 / 模块边界时 |
| 5 | `docs/architecture/deploy.md` | 涉及交付与部署说明时 |

## 标准流程（Agent 检查清单）

```text
[ ] 1. 澄清：≤5 问/轮，先收敛边界再写代码
[ ] 2. 规划：补齐 milestone（Goal / 验收 / Non-goals / 风险）
[ ] 3. 实现：最小 diff，优先复用既有模块
[ ] 4. 本地门禁：npm run verify
[ ] 4.1 若涉及主题/皮肤：npm run check:theme-contrast（不通过先修复）
[ ] 5. 提交：经用户确认后提交并 push 到 main
[ ] 6. 交付：提醒 owner 进行手动部署（npm run deploy:tencent）
```

## 模糊需求时 Agent 应做什么

1. **规划**：澄清边界，更新 milestone
2. **实现**：按 milestone 改代码；同一问题失败两次就停下复盘
3. **确认**：给出变更与验证结果，等用户确认后再提交

## Agent 禁止事项

- 未经确认直接 `git commit` / `git push`
- 超出 milestone 边界擅自扩 scope
- 把 Secret 写入代码或文档
- 把部署步骤描述成自动流水线（当前为手动部署）

## 常用命令

```bash
# 需求
npm run req:list
npm run req:list -- --all

# 验证
npm run verify
bash scripts/verify-local.sh --skip-e2e
```
