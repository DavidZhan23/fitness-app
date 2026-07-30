# ADR-0008: 热量公式共享包（取代双端各一份长期策略）

**Status:** accepted  
**Date:** 2026-07-28

## Context

BMR/TDEE 与缺口/代谢算法长期在前端（`src/lib/calories.ts`、`metabolism.ts`）与后端（`server/src/calories.js`、`metabolism.js`）各维护一份（见 [ADR-0003](0003-formula-sync.md)）。架构 grill（2026-07-28）确认产品主轴是本人日账本，数字必须前后端一致；决定**合并为一份源码**，不再把「双份 + 手动同步」当作长期策略。

`dateKey` 前后端语义不同（浏览器本地日 vs `DISPLAY_TIMEZONE`），**不**纳入本包（见 [ADR-0004](0004-date-tz-strategy.md)）。

## Decision

1. 新增轻量共享目录 **`packages/calories`**（纯函数，无 React / Express 依赖），收录：
   - `toKcal` / BMR / TDEE / 缺口相关（现 `calories`）
   - 分钟级代谢 / `calculateSpreadDeficit` 等（现 `metabolism`）
2. 前端与 `server` 均从此包 import；删除或薄封装原路径，避免第二份实现。
3. 搬迁作为**独立 milestone** 实施；本 ADR 先冻结方向。搬迁完成前：改公式仍须两端同步，并保留 parity 测试。
4. **不做：** 仅服务端算、前端全靠 API（损害今日页首屏）；把 `dateKey` 塞进共享包。

## Consequences

### Positive

- 单一真相源，降低社区/今日数字漂移风险。
- 与「账本主轴」架构叙述一致。

### Negative

- 需引入最小 packaging / 引用方式（workspaces 或相对路径），有一次性改造成本。
- 在搬迁完成前存在文档目标与代码现状短暂不一致——以本 ADR + milestone 跟踪。
