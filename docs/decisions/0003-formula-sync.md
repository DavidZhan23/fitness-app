# ADR-0003: 前后端公式双份临时策略

**Status:** deprecated（被 [ADR-0008](0008-shared-calories-package.md) 取代）  
**Date:** 2026-05-24  
**Deprecated:** 2026-07-28

## Context

BMR/TDEE 计算公式（Mifflin-St Jeor）与热量缺口算法在前端（`src/lib/calories.ts`、`src/lib/metabolism.ts`）和后端（`server/src/calories.js`、`server/src/metabolism.js`）各存一份。当前项目为单仓库但未配置 npm workspaces / shared 包，两份实现需手动保持一致。

已知风险：若一端悄悄修改公式而另一端未同步，会导致前后端展示数字不一致。

## Decision

**（历史）** 阶段二之前维持双份现状，并引入一致性守门 / parity 测试；不创建 shared 包。

**（现行）** 2026-07-28 起改为共享包一份源码，见 **ADR-0008**。在 `packages/calories` 落地完成前，代码仍可能双端并存——改公式须两端一起改，parity 测试保留。

## Consequences

见 ADR-0008。本文件保留作历史上下文。
