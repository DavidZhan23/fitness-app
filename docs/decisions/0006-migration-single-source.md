# ADR-0006: 迁移至 SQL Migration 单一真相源（分阶段）

- Status: accepted
- Date: 2026-05-27

## Context

当前数据库演进同时存在两条路径：

1. `server/migrations/*.sql`
2. `server/src/db.js#runMigrations()` 内联 DDL

这会造成双真相源风险：不同环境可能走到不同路径，难以判断某条变更是否“已真正执行”。

## Decision

采用分阶段收口，不立即删除兼容逻辑：

1. **Phase 1（当前）**：保留 inline DDL，仅标记为 legacy compatibility；新增 parity 报告脚本用于观测差异
2. **Phase 2**：新环境默认只依赖 SQL migration，inline DDL 标注 deprecated，不再新增内容
3. **Phase 3**：在确认存量环境完成迁移后移除 inline DDL

## Consequences

- 正向：在不破坏老环境启动路径的前提下，逐步收敛到 `server/migrations/*.sql` 为唯一真相源
- 正向：通过 parity 报告可提前暴露 drift 风险
- 代价：Phase 1/2 期间仍需维护兼容注释和迁移纪律，不能一次性“删干净”
