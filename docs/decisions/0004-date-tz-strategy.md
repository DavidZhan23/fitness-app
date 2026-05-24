# ADR-0004: 日期键时区策略（前端本地 vs 后端 Asia/Shanghai）

**Status:** accepted  
**Date:** 2026-05-24

## Context

打卡日期键（`YYYY-MM-DD`）在系统中有两个产生来源：

- **前端**：`src/lib/streaks.ts#formatDateKey` 使用 `new Date()` + 浏览器本地时区，输出键依用户设备时区变化。
- **后端**：`server/src/dateKey.js#formatDateKeyInTz` 使用 `Intl.DateTimeFormat` 固定 `Asia/Shanghai` 时区。

当前所有用户均为国内家庭成员（Asia/Shanghai），两者实际输出一致。但代码层面存在语义差异：前端"设备当地日期"，后端"上海日期"。

## Decision

维持现有双源实现，接受"隐式对齐"：

- 前端继续使用设备本地时区（面向家庭用户，设备均在国内，结果等同 Shanghai）。
- 后端继续使用固定 `Asia/Shanghai`（服务器可能部署在任意时区，需显式固定）。
- 不合并为单一时区工具函数，不引入共享包。

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
