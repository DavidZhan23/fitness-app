# Milestones（功能规格）

非琐碎功能在写代码前对齐 Goal / 验收 / 边界。小改动可跳过。

## Active（只看这张表）

| 文档 | Branch / 备注 |
|------|----------------|
| [M-2026-06-user-weekly-report](M-2026-06-user-weekly-report.md) | `main` |
| [M-2026-07-today-wall-merge](M-2026-07-today-wall-merge.md) | `dev/huanghongli` |
| [M-2026-07-ai-log-no-voice-per-unit-kcal](M-2026-07-ai-log-no-voice-per-unit-kcal.md) | `dev/huanghongli` |
| [M-2026-08-batman-v-superman-theme](M-2026-08-batman-v-superman-theme.md) | `dev/huanghongli` |

**Status 取值：** `active` | `done` | `cancelled`（`npm run check:milestones` 校验文件头 Status）

已完成条目见 **[archive.md](archive.md)**（默认不必打开）。

## 创建

```bash
bash scripts/new-feature.sh <slug>
```

同步 `dev/huanghongli` + 生成骨架；**不**默认开 `feat/<slug>`。复杂功能可用 [_TEMPLATE.md](_TEMPLATE.md) 命名为 `M-YYYY-MM-<slug>.md`，并加入上表。

Done 时：文件头 `Status: done`，从上表挪到 [archive.md](archive.md)。

## 相关

- 闭环：[../ai-playbook.md](../ai-playbook.md)
- 文档中心：[../README.md](../README.md)
