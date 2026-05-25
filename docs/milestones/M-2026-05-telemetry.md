# Milestone: 轻量交互遥测（L4 · Phase 1a）

**Status:** done
**Branch:** `feat/infra-e2e-telemetry` → PR #46（已合并）
**Issue:** — (内部工程改善)
**Started:** 2026-05-24

> **接力**：Phase 1b（白名单收紧 + fallback 埋点 + session/version 上下文列）和 Phase 2（周报）在 [M-2026-05-telemetry-weekly](M-2026-05-telemetry-weekly.md) 中继续。

## 1. 任务背景

E2E 只能防已知回归；线上交互耗时、AI 失败率、保存失败等需要轻量埋点。采用自托管 PG 存事件，暂不建看板。

## 2. 目标 (Goal)

记录关键交互指标到 `telemetry_events` 表，前端 fire-and-forget 批量上报，服务端 AI 路由补充耗时。

## 3. 成功标准 (Success criteria)

- [ ] `telemetry_events` 表 + migration + `db.js` 幂等 DDL
- [ ] `POST /telemetry/events` 白名单校验 + 批量写入
- [ ] 前端：`page_load`、`route_change`、AI 估算成功/超时/失败、记录保存成功/失败
- [ ] 服务端：`ai_estimate_server_ok/fail` 含 duration_ms
- [ ] `docs/architecture/api-contract.md` 同步

## 4. Non-goals

- 管理看板 / Grafana
- 第三方 Sentry/Plausible
- 全站每个 click 埋点
- PII（饮食名称等）写入 metadata

## 5. 已阅读的相关文档

- [x] `docs/architecture/api-contract.md`
- [x] `docs/architecture/overview.md`
- [x] `.cursor/rules/06-reuse-first.mdc`

## 6. 已检查的可复用模块

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| HTTP 上报 | `src/lib/api/http.ts#apiFetch` | 是 |
| 路由感知 | React Router `useLocation` | 是，新建 `TelemetryListener` |
| DB 写入 | `server/src/db.js#query` | 是 |

新建 `src/lib/telemetry.ts`、`server/src/telemetry.js`（无平行实现）。

## 7. 涉及文件

- `server/migrations/011_telemetry_events.sql`
- `server/src/telemetry.js`, `server/src/routes/telemetry.js`
- `server/src/routes/ai.js`, `server/src/db.js`, `server/src/index.js`
- `src/lib/telemetry.ts`, `src/components/TelemetryListener.tsx`
- `src/App.tsx`, `src/components/AiKcalEstimate.tsx`, `src/pages/LogPage.tsx`
- `src/lib/api/index.ts`

## 8. 查询示例（运维）

```sql
-- 近 7 日 AI 超时率（客户端感知）
select
  count(*) filter (where event_name = 'ai_estimate_timeout') as timeouts,
  count(*) filter (where event_name = 'ai_estimate_success') as successes
from telemetry_events
where event_name like 'ai_estimate_%'
  and created_at > now() - interval '7 days';

-- 路由切换 P95（ms）
select percentile_cont(0.95) within group (order by duration_ms)
from telemetry_events
where event_name = 'route_change'
  and created_at > now() - interval '7 days';
```

## 9. 回滚

- `git revert`；表可保留（只追加事件，不影响业务）

## 10. 是否满足最小可运行闭环

是——未配置后端时不埋点；有后端时静默上报，失败不阻塞 UI。
