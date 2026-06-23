# Milestones（功能规格）

每个功能在**写代码前**应有规格文档，供开发者与 Cursor 对齐 Goal、验收与边界。

## 活跃 / 历史

| 文档 | Status | Branch / PR |
|------|--------|-------------|
| [M-2026-05-ai-workflow](M-2026-05-ai-workflow.md) | done | `feat/ci-cd-workflow` → PR #1 |
| [M-2026-05-req-intake](M-2026-05-req-intake.md) | done | `feat/req-intake` |
| [M-2026-05-refactor-stage1](M-2026-05-refactor-stage1.md) | done | `feat/refactor-stage1-docs` → PR #11 |
| [M-2026-05-refactor-stage2](M-2026-05-refactor-stage2.md) | done | `feat/refactor-stage2-cleanup` → PR #29 |
| [M-2026-05-refactor-stage3](M-2026-05-refactor-stage3.md) | done | `feat/refactor-stage3-routes` → PR #38 |
| [M-2026-05-playwright-e2e](M-2026-05-playwright-e2e.md) | done | `feat/playwright-e2e-smoke` → PR #43 |
| [M-2026-05-telemetry](M-2026-05-telemetry.md) | done | `feat/infra-e2e-telemetry` → PR #46 |
| [M-2026-05-telemetry-weekly](M-2026-05-telemetry-weekly.md) | done | Phase 1b → PR #48；Phase 2 → PR #51 |
| [M-2026-05-community-profile](M-2026-05-community-profile.md) | done | PR #54（+ polish PR #61） |
| [M-2026-05-pink-blue-light-theme](M-2026-05-pink-blue-light-theme.md) | done | `feat/style-color-tuning` |
| [M-2026-05-macaron-themes](M-2026-05-macaron-themes.md) | done | `feat/style-color-tuning`（接续：拆出 cream / sakura） |
| [M-2026-05-scroll-avatar-wall](M-2026-05-scroll-avatar-wall.md) | done | #50 #30 #75 #71 #78 |
| [M-2026-05-today-page-layers](M-2026-05-today-page-layers.md) | done | `feat/today-page-layers` |
| [M-2026-06-avatar-upload-reliability](M-2026-06-avatar-upload-reliability.md) | done | `main` |
| [M-2026-06-log-composer-responsive](M-2026-06-log-composer-responsive.md) | done | `main` |
| [M-2026-06-today-calorie-result-copy](M-2026-06-today-calorie-result-copy.md) | done | `main` |
| [M-2026-06-metabolism-mode](M-2026-06-metabolism-mode.md) | done | `main` |
| [M-2026-06-daji-fox-companion](M-2026-06-daji-fox-companion.md) | done | `main` |
| [M-2026-06-user-weekly-report](M-2026-06-user-weekly-report.md) | active | `main` |

**Status 取值：** `active` | `done` | `cancelled`
（`npm run check:milestones` 会对未知值报警，如 `partial` / `superseded`。）

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
