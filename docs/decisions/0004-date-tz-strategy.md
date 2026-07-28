# ADR-0004: 日期键时区策略（前端本地 vs 后端 Asia/Shanghai）

**Status:** accepted  
**Date:** 2026-05-24

## Context

打卡日期键（`YYYY-MM-DD`）在系统中有两个产生来源：

- **前端**：`src/lib/streaks.ts#formatDateKey` 使用 `new Date()` + 浏览器本地时区，输出键依用户设备时区变化。
- **后端**：`server/src/dateKey.js#formatDateKeyInTz` 使用 `Intl.DateTimeFormat` 固定 `Asia/Shanghai` 时区。

当前所有用户均为国内家庭成员（Asia/Shanghai），两者实际输出一致。但代码层面存在语义差异：前端"设备当地日期"，后端"上海日期"。

## Decision

维持双源，并在文档中**显式区分两种「日」**（2026-07-28 架构 grill 确认）：

- **记账 / 今日页 / 打卡墙：** 浏览器**本地日历日**（`formatDateKey`）——体感「我的今天」。
- **配额 / 用户周报自然周 / 狐狸周等服务端日历逻辑：** `DISPLAY_TIMEZONE`（默认 **Asia/Shanghai**，`formatDateKeyInTz`）。
- 不合并为单一时区工具；**不**把 dateKey 塞进热量共享包（ADR-0008）。

国内家庭用户下两者通常一致；写功能时勿混用。

**不做的事**（本阶段）：

- 不向 API 传递客户端时区偏移量。
- 不支持多时区用户（非目标用户群）。

**未来归并触发条件**：

1. 产品需支持非 CST 时区用户。
2. 发现跨午夜操作导致前后端日期键不一致的 bug。

## Consequences

### Positive

- 前后端各自简单，无需引入时区传参协议。
- 对当前用户群（国内家庭）完全透明，无实际影响。

### Negative

- 若未来支持海外用户，需专项重构日期键生成逻辑。
- 新开发者可能困惑为何前后端使用不同的时区工具函数，需靠本 ADR 和注释说明。
