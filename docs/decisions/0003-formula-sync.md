# ADR-0003: 前后端公式双份临时策略

**Status:** accepted  
**Date:** 2026-05-24

## Context

BMR/TDEE 计算公式（Mifflin-St Jeor）与热量缺口算法在前端（`src/lib/calories.ts`、`src/lib/metabolism.ts`）和后端（`server/src/calories.js`、`server/src/metabolism.js`）各存一份。当前项目为单仓库但未配置 npm workspaces / shared 包，两份实现需手动保持一致。

已知风险：若一端悄悄修改公式而另一端未同步，会导致前后端展示数字不一致。

## Decision

**阶段二**之前维持双份现状，但引入"一致性守门测试"：

- 在 `server/` 下写少量 parity 测试，对相同输入断言前后端公式输出相同（跨进程比对）。
- 任何公式改动必须同时更新两端代码及其 parity 测试，否则 CI 红灯。

**不做的事**（本阶段）：

- 不创建 `packages/shared` 或 npm workspaces。
- 不将 `src/lib/calories.ts` 编译为 CommonJS 供 server 引用。
- 不引入 OpenAPI / JSON Schema 自动校验。

**未来归并触发条件**（满足任一项可重新评估）：

1. 公式改动频率 > 1 次/月，且每次都需两端同步。
2. 项目引入正式 monorepo 工具（Turborepo / pnpm workspaces）。
3. 阶段三路由拆分完成后，server 模块边界更清晰，提取 shared 成本更低。

## Consequences

### Positive

- 零额外构建复杂度，前后端各自独立可运行。
- Parity 测试在 CI 中自动报警，防止静默漂移。

### Negative

- 两份文件需手动同步，属于技术债。
- 开发者需记住"改公式一定要改两处"，依赖规则（`06-reuse-first.mdc` 硬规则）和 parity 测试双重提醒。
