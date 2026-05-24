# Milestones（功能规格）

每个功能在**写代码前**应有规格文档，供开发者与 Cursor 对齐 Goal、验收与边界。

## 活跃 / 历史

| 文档 | Status | Branch / PR |
|------|--------|-------------|
| [M-2026-05-ai-workflow](M-2026-05-ai-workflow.md) | done | `feat/ci-cd-workflow` → PR #1 |
| [M-2026-05-req-intake](M-2026-05-req-intake.md) | done | `feat/req-intake` |
| [M-2026-05-refactor-stage1](M-2026-05-refactor-stage1.md) | active | `feat/refactor-stage1-docs` |

**Status 取值：** `active` | `done` | `cancelled`

## 创建新 milestone

```bash
bash scripts/new-feature.sh <slug>
```

生成 `feat/<slug>` 分支与 `docs/milestones/<slug>.md` 骨架。复杂功能可复制 [_TEMPLATE.md](_TEMPLATE.md) 为 `M-YYYY-MM-<slug>.md` 并上表登记。

## 文档里应有什么

见 [_TEMPLATE.md](_TEMPLATE.md)：`Goal`、`Success criteria`、`Non-goals`、边界、风险。Cursor 规划阶段按 `.cursor/rules/01-planning-clarify.mdc` 填写。

## 相关

- [../ai-playbook.md](../ai-playbook.md) — Agent 何时读 milestone
- [../README.md](../README.md) — 文档总导航
