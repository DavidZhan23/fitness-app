# 前端轻量观测设计（L4）

> 定位：**轻量前端体验观测 + 每周质量复盘**。不是大数据分析、不是看板、不引入大型分析 SDK。
> 现阶段 PG 存原始事件，[`docs/reports/weekly/`](../reports/weekly/) 存周报导出物（M5 看板再说）。

## 1. 事件白名单（6 个）

任何不在表内的事件名都会被前端 `trackMetric` 与后端 `normalizeEvent` 双侧静默丢弃。

| 事件 | 触发位置 | 顶层字段 | metadata（白名单内）|
|------|----------|----------|---------------------|
| `route_change` | `TelemetryListener` 监听 `react-router-dom#useLocation` 变更 | `route` = to；`durationMs` | `route_from`、`route_to`、`duration_ms` |
| `page_load` | `TelemetryListener` 首次 mount | `route` = current；`durationMs`（来自 `performance.getEntriesByType('navigation')`） | `duration_ms`、`status='ok'` |
| `ai_estimate_success` | `AiKcalEstimate` DeepSeek 成功 | `durationMs` | `kind`、`input_mode='ai'`、`input_length`、`duration_ms`、`status='ok'` |
| `ai_estimate_timeout` | DeepSeek 504 / `AbortError`（35s 客户端超时） | `durationMs` | `kind`、`input_mode='ai'`、`input_length`、`duration_ms`、`status='timeout'`、`error_type='timeout'` |
| `ai_estimate_error` | DeepSeek 其他错误（401/402/502/网络/parse） | `durationMs` | `kind`、`input_mode='ai'`、`input_length`、`duration_ms`、`status='error'`、`error_type='network' \| 'error'` |
| `ai_estimate_fallback_complete` | 保存成功 **且** 最近一次 AI 是 `timeout`/`error` | `durationMs`（从 LogPage 打开到保存完成的总耗时） | `kind`、`input_mode='manual' \| 'template' \| 'default_estimate'`、`duration_ms`、`status='saved'` |

## 2. metadata 字段白名单

| 字段 | 允许值 / 类型 | 说明 |
|------|---------------|------|
| `input_length` | int | 输入字数（**不含原文**）|
| `input_mode` | `'ai'` \| `'manual'` \| `'template'` \| `'default_estimate'` | 估算来源 |
| `route_from` | string ≤ 200 | URL path，不含 query string |
| `route_to` | string ≤ 200 | URL path |
| `duration_ms` | int ≥ 0 | 耗时 |
| `status` | `'ok'` \| `'error'` \| `'timeout'` \| `'saved'` | 终态 |
| `error_type` | `'timeout'` \| `'error'` \| `'network'` \| `'parse'` | 错误分类 |
| `kind` | `'exercise'` \| `'meal'` | 业务品类（区分餐 / 运动 AI 估算）|

**禁止**记录：饮食原文 / 体重 / 身体数据 / 备注 / 任何 PII。
实现层面：前端 `trackMetric` 入口 `sanitizeMetadata` pick 一遍，后端 `normalizeEvent` 再 pick 一遍兜底。任何不在白名单的字段——包括看似无害的 `kind`、`type`、`error`——**只有列在上面的 8 个**会被保留。

## 3. fallback_complete 状态机

```
[初始状态] pendingFallback = false, lastInputMode = 'manual'

  ┌─────────────── 用户点 AI 估算 ───────────────┐
  ▼                                              │
[AI 估算执行中]                                  │
  ├─ 成功 → pendingFallback = false              │
  │         lastInputMode = 'ai'                 │
  ├─ 超时 → pendingFallback = true               │
  │         lastInputMode = 'manual'             │
  └─ 错误 → pendingFallback = true               │
            lastInputMode = 'manual'             │
                  │                              │
                  ▼                              │
        用户改用模板 ─→ lastInputMode = 'template'│
        用户手动输 kcal ─→ lastInputMode 不变     │
                  │                              │
                  ▼                              │
            [点保存成功]                          │
                  │                              │
  ┌───────────────┴───────────────────┐          │
  │ pendingFallback === true ?         │          │
  └──┬─────────────────────────────┬─┘          │
     │ 是                          │ 否          │
     ▼                             ▼             │
触发 ai_estimate_                 不触发          │
fallback_complete                                │
metadata.input_mode =                            │
  lastInputMode                                  │
pendingFallback = false ─────────────────────────┘
```

实现：`src/pages/LogPage.tsx`、`src/components/AiKcalEstimate.tsx`。

## 4. 上下文字段（顶层列，非 metadata）

| 字段 | 来源 | 说明 |
|------|------|------|
| `session_id` | 前端 `sessionStorage`（每个 tab 一个，首次访问生成）| 用于按 session 聚合，识别同一次访问内的多个事件 |
| `app_version` | `import.meta.env.VITE_APP_VERSION`（构建时由 `vite.config.ts` 从 `package.json` 注入；CI 可用 env 覆盖）| 跨版本对比 |
| `commit_sha` | `import.meta.env.VITE_COMMIT_SHA`（`vite.config.ts` 执行 `git rev-parse --short HEAD` 注入；CI 可用 env 覆盖）| 用于回归定位 |

均 nullable，缺失时为空字符串/null，不影响事件入库。

## 5. 上报通道与失败兜底

`src/lib/telemetry.ts` 的 `trackMetric()`：

1. 检查开关：`VITE_TELEMETRY_DISABLED === '1'` 或 backend 未配置 → 静默返回
2. 校验事件名 & 已登录 → 否则静默返回
3. `sanitizeMetadata` 按白名单 pick 字段
4. 入队，达到 20 条或 5 秒后触发 flush

flush 时：

- 默认走 `fetch(..., { keepalive: true })` + Bearer token
- `visibilitychange='hidden'` / `pagehide`：`force=true`，**优先** `navigator.sendBeacon`（无需 token header，但服务端需要 admin 配合放行——目前我们要求登录，beacon 在这里仍需 token，因此实际上 beacon 走的也是 anon path；当 beacon 不可用时回退 fetch keepalive）
- 失败：**force 模式静默丢弃**；普通模式回滚队列、延迟重试

任何阶段抛错均不冒泡到 UI / 不阻塞主流程。

## 6. 与数据库列的对应

```sql
-- 来自 server/migrations/011 + 013
public.telemetry_events
  id           uuid          -- 自动
  user_id      uuid (fk)     -- 登录用户
  event_name   text          -- 6 个白名单之一
  route_path   text          -- 顶层 route（与 metadata.route_to 同步）
  duration_ms  integer       -- 顶层 durationMs
  metadata     jsonb         -- 白名单字段（最多 8 个 key）
  client_at    timestamptz   -- 客户端时间（用户时区）
  session_id   text          -- 见 §4
  app_version  text          -- 见 §4
  commit_sha   text          -- 见 §4
  created_at   timestamptz   -- 服务端入库时间
```

索引：`(event_name, created_at desc)`、`(user_id, created_at desc)`、`(session_id, created_at desc)`。

## 7. 关键 SQL（运维 / 周报）

```sql
-- 近 7 日 AI 总量与各终态
select
  count(*) filter (where event_name = 'ai_estimate_success') as success,
  count(*) filter (where event_name = 'ai_estimate_timeout') as timeout,
  count(*) filter (where event_name = 'ai_estimate_error')   as error,
  count(*) filter (where event_name = 'ai_estimate_fallback_complete') as fallback
from telemetry_events
where created_at > now() - interval '7 days'
  and event_name like 'ai_estimate_%';

-- route_change P50 / P95
select
  percentile_cont(0.5)  within group (order by duration_ms) as p50,
  percentile_cont(0.95) within group (order by duration_ms) as p95
from telemetry_events
where event_name = 'route_change'
  and created_at > now() - interval '7 days';

-- 最慢的 route_from → route_to 路径 Top 5
select
  metadata->>'route_from' as from_route,
  metadata->>'route_to'   as to_route,
  percentile_cont(0.95) within group (order by duration_ms) as p95,
  count(*) as n
from telemetry_events
where event_name = 'route_change'
  and created_at > now() - interval '7 days'
  and metadata ? 'route_from' and metadata ? 'route_to'
group by 1, 2
having count(*) >= 5
order by p95 desc
limit 5;

-- 跨版本对比：本周 vs 上周 P95
select app_version,
       percentile_cont(0.95) within group (order by duration_ms) as p95,
       count(*) as n
from telemetry_events
where event_name = 'route_change'
  and created_at > now() - interval '14 days'
  and app_version <> ''
group by app_version
order by p95 desc;
```

## 8. 与 M5 看板的衔接（先不做）

未来要做看板时，**不必改埋点**：

- 直接读 `telemetry_events`（事件层）即可还原原始体验
- 读 `weekly_reports`（聚合层，Phase 2 引入）即可还原周维度
- `session_id`、`app_version`、`commit_sha` 提供"会话 / 版本 / 提交"三个下钻维度

新增前端只需要一个 admin 受保护页面，调 `GET /telemetry/weekly-reports` 等接口即可。
