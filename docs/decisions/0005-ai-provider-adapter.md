# ADR-0005: AI 估算 Provider Adapter 雏形

- Status: accepted
- Date: 2026-05-27

## Context

当前 `/ai/estimate-kcal` 直接绑定 `DeepSeek` 实现，路由与 provider 逻辑耦合。后续若接入视觉模型（图片输入）或多 provider fallback，会导致在现有 `deepseek` 逻辑里继续堆条件分支，放大维护风险。

## Decision

引入轻量 adapter 分层，但保持接口行为不变：

1. `server/src/ai/registry.js` 负责 provider 选择（默认 `deepseek-text`）
2. `server/src/ai/providers/deepseekText.js` 承载 DeepSeek 文本估算实现
3. `/ai/estimate-kcal` 路由只做参数校验 + profile 查询 + estimator 调用
4. 对外响应仍返回 `{ kcal }`，不改 API 契约

## Consequences

- 正向：路由不再与单一 provider 强耦合，为后续 vision provider 留出稳定接入点
- 正向：保留现有行为，避免一次性重构引入回归
- 代价：当前仍只注册一个 provider，短期收益主要是结构解耦而非功能扩展
