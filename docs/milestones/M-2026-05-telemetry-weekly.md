# Milestone: L4 最小埋点 + 每周质量报告

**Status:** done
**Branch:** Phase 1b → `feat/telemetry-l4-tighten` (PR #48 merged)；Phase 2 → `feat/telemetry-weekly-report` (PR #51 merged)
**Issue:** —（内部工程改善，紧接 `M-2026-05-telemetry` 的 Phase 1a 实现）
**Started:** 2026-05-24
**Closed:** 2026-05-27（Status 滞后回填；§4 checklist 未在合并前回勾，验收以 PR #48 / #51 描述与 commit 历史为准）

## 1. 任务背景

fitness-app 仍在测试期，近期 bug 集中在前端交互、路由切换卡顿、页面 loading 状态、
AI 估算超时等问题。当前**不需要复杂 dashboard**，需要一套轻量观测 + 周复盘机制，
用数据判断「交互体验」与「AI 估算兜底」是否真的在变好。

Phase 1a 的代码已在 `feat/infra-e2e-telemetry` PR 上等待 merge：实现了
`telemetry_events` 表、前后端上报、`POST /telemetry/events`、9 个事件白名单。
本 milestone 在此基础上做：

- **Phase 1b：收紧白名单 + 引入 fallback 指标 + 表结构补列**
- **Phase 2：周报自动化 + AI 解读 + docs 导出**

## 2. 目标 (Goal)

让项目从「凭感觉修交互问题」变成：
**发现问题 → 埋点记录 → 每周聚合 → AI 辅助解释 → 给出优化建议 → 下周验证指标**。

## 3. 核心原则（不可越界）

1. 不做重型埋点系统、不做复杂 dashboard、不引入大型分析 SDK。
2. PG 作为主存储；`docs/reports/weekly/*.md` 是**导出物**，不是主数据源。
3. 埋点失败不能影响用户主流程（fire-and-forget；前端任何阶段错误静默丢弃）。
4. 不采集用户饮食文本、体重、身体数据等敏感原文。
5. metadata 字段实行**白名单**（见 §10）。
6. 第一版只保证「链路简单、稳定、可复用」。

## 4. 成功标准 (Success criteria)

### Phase 1b（埋点修正）

- [ ] `telemetry_events` 事件白名单收紧为 6 个：`route_change`、`page_load`、`ai_estimate_success`、`ai_estimate_timeout`、`ai_estimate_error`、`ai_estimate_fallback_complete`（移除 `ai_estimate_server_ok/fail`、`log_save_success/failure`）
- [ ] `server/migrations/013_telemetry_events_context.sql`：给 `telemetry_events` 添加列 `session_id text`、`app_version text`、`commit_sha text`（均 nullable，可索引 `session_id`）；`db.js#runMigrations` 同步幂等 DDL
- [ ] 前端 `src/lib/telemetry.ts`：`trackMetric()` 实行 metadata 白名单（仅允许 `input_length`、`input_mode`、`route_from`、`route_to`、`duration_ms`、`status`、`error_type`），其他字段静默丢弃；上报通道优先 `navigator.sendBeacon`，回退 `fetch(keepalive: true)`
- [ ] 前端 `session_id` 生成（首次 sessionStorage，刷新页/换 tab 复用），随每条事件上报
- [ ] `app_version` 来自 `import.meta.env.VITE_APP_VERSION`（构建注入）；`commit_sha` 来自 `VITE_COMMIT_SHA`（CI 写入）；缺省为空字符串
- [ ] AI 估算 fallback 完成埋点：组件层保留"最近一次 AI 是否超时/错误"状态，用户保存成功时若该状态为真，触发 `ai_estimate_fallback_complete`，并 reset 状态
- [ ] 后端 `routes/telemetry.js` 把新字段透传写入；`POST /telemetry/events` 普通登录用户可用（**非 admin only**）
- [ ] 同步 `docs/architecture/api-contract.md` 与 `docs/architecture/overview.md` ER
- [ ] Smoke 通过

### Phase 2（周报）

- [ ] `server/migrations/014_weekly_reports.sql` + `db.js` 幂等 DDL，字段见 §9
- [ ] `server/src/weeklyReport.js`：纯函数 `computeWeeklyMetrics(events) -> metrics`、`composeMetricsMarkdown(metrics) -> string`、`explainWithDeepSeek(metrics) -> { analysis_md, recommendations_md }`（失败降级占位）、`buildReportMd({ metrics, analysis_md, recommendations_md })`
- [ ] `server/src/scheduler.js`：node-cron，每周一 02:00 Asia/Shanghai 触发；幂等（同 `week_id` 默认 skip，`--force` / regenerate API 覆盖）
- [ ] Admin middleware：`server/src/auth.js#requireAdmin`，基于 `ADMIN_EMAILS` 环境变量（逗号分隔，trim+lowercase 比对 `req.userEmail`）
- [ ] 接口（均 admin only）：
  - [ ] `GET /telemetry/weekly-reports`（列表）
  - [ ] `GET /telemetry/weekly-reports/:week`（详情，含完整 `report_md`）
  - [ ] `POST /telemetry/weekly-reports/:week/regenerate`（重新跑）
- [ ] `scripts/weekly-telemetry-report.mjs --mock`：用 mock 数据生成 demo markdown 到 stdout，验证模板与 prompt 链路（不连 DB、不调 DeepSeek 真实接口）
- [ ] `scripts/pull-weekly-report.mjs <week> --token <jwt> [--force]`：拉接口写 `docs/reports/weekly/<week>.md`（文件已存在且无 `--force` 时拒绝）
- [ ] 新文档：
  - [ ] `docs/metrics/frontend-metrics-design.md`（指标定义 / 触发点 / 隐私边界 / metadata 白名单）
  - [ ] `docs/metrics/weekly-report-template.md`（周报 8 段结构 + AI 解读表达规范）
  - [ ] `docs/reports/weekly/README.md`（解释这里放什么、怎么读、如何拉取）
- [ ] 同步：`docs/architecture/api-contract.md`、`docs/architecture/overview.md` ER 追加 `weekly_reports`、`deploy/.env.example` 追加 `ADMIN_EMAILS=`、根 `README.md` 「功能」追加一行
- [ ] Smoke：`npm run lint`、`npm run typecheck`、`npm run build`、`node --check server/src/index.js`、`node scripts/weekly-telemetry-report.mjs --mock`

## 5. Non-goals

- **前端看板 / UI 页面**（M5 再做；本 milestone 完成后预留接入口）
- 月报 / 自定义时间段 / 多维下钻（按用户、按设备）
- 复杂 BI / 复杂 dashboard / A/B testing
- 匿名 session 上报（本期仅登录态上报；未来若要全站访客，再单独做 session 设计）
- 容器内自动 `git push`（不引入 PAT / deploy key 风险）
- 加 `users.role` 列（本期用 `ADMIN_EMAILS` env）
- 引入新 AI SDK（复用 DeepSeek HTTP）
- `log_save_*`、`ai_estimate_server_*` 事件（被本期收紧移除；如未来确需服务端 AI 耗时观测，另立 milestone）

## 6. 已阅读的相关文档

- [x] `docs/milestones/M-2026-05-telemetry.md`（Phase 1a 规格）
- [x] `docs/architecture/api-contract.md`、`docs/architecture/overview.md`
- [x] `.cursor/rules/06-reuse-first.mdc`、`.cursor/rules/04-docs-and-architecture.mdc`
- [x] `server/src/deepseekKcal.js`（DeepSeek HTTP 套路）
- [x] `server/src/telemetry.js`、`server/src/routes/telemetry.js`、`server/src/auth.js`、`server/src/dateKey.js`
- [x] `src/lib/telemetry.ts`、`src/components/TelemetryListener.tsx`、`src/components/AiKcalEstimate.tsx`、`src/pages/LogPage.tsx`
- [x] `deploy/docker-compose.yml`、`deploy/.env.example`

## 7. 已检查的可复用模块

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| HTTP 上报（带 token） | `src/lib/api/http.ts#apiFetch` | 是；trackMetric 内部仍走它，只在 metadata 白名单/sendBeacon 分支多一层 |
| 路由感知 | `TelemetryListener` (`react-router-dom#useLocation`) | 是 |
| DB 查询 | `server/src/db.js#query` | 是 |
| 日期 / 周对齐 | `server/src/dateKey.js#formatDateKeyInTz` | 是；新增 `getIsoWeekKey(date)` 辅助 |
| DeepSeek HTTP / 超时 / 重试 / 错误映射 | `server/src/deepseekKcal.js` 内的 `requestDeepSeekWithRetry`、错误处理 | 参考其套路新写 `explainWithDeepSeek`（提示词不同；不复用业务函数 `estimateKcalFromDescription`） |
| Auth | `server/src/auth.js#authMiddleware` | 是；同文件新增 `requireAdmin` |
| Async route 包装 | `server/src/asyncHandler.js#asyncHandler` | 是 |
| 公共昵称 / 用户 | `server/src/publicProfile.js` | 不需要（只用 `req.userEmail`） |

新建：`server/src/weeklyReport.js`、`server/src/scheduler.js`、
`scripts/weekly-telemetry-report.mjs`、`scripts/pull-weekly-report.mjs`、
`docs/metrics/*`、`docs/reports/weekly/*`。无平行实现。

## 8. 事件白名单与触发点

| 事件 | 触发位置 | 关键字段 |
|------|----------|----------|
| `route_change` | `TelemetryListener` `useLocation` 变更 | `route` = to；`durationMs`；metadata: `route_from`、`route_to`、`duration_ms` |
| `page_load` | `TelemetryListener` 首次 mount | `route` = current；`durationMs`（用 `performance.getEntriesByType('navigation')`）；metadata: `duration_ms`、`status` |
| `ai_estimate_success` | `AiKcalEstimate` 估算成功 | `durationMs`；metadata: `input_length`、`input_mode`、`status='ok'`、`duration_ms` |
| `ai_estimate_timeout` | DeepSeek 504 / AbortError 分支 | `durationMs`；metadata: `error_type='timeout'`、`input_length`、`input_mode` |
| `ai_estimate_error` | DeepSeek 其他错误（401/402/502 等） | metadata: `error_type='error'`、`status=<http>`、`input_length`、`input_mode` |
| `ai_estimate_fallback_complete` | 用户保存成功 **且** "最近一次 AI 是 timeout/error" 标志为真 | metadata: `input_mode='manual'\|'template'\|'default_estimate'`、`status='saved'` |

`ai_estimate_fallback_complete` 触发流程：

```text
AI 估算  ──timeout/error──▶ 在 LogPage 内置一个 ref { pendingFallback: true }
                                  ↓
                  用户改用手动 / 模板 / 默认值 → 点击保存 → 保存成功
                                  ↓
              触发 ai_estimate_fallback_complete，pendingFallback 重置为 false
                                  ↓
              若该次 AI 直接 success，pendingFallback 不置位，不触发 fallback
```

## 9. 数据库设计

### 9.1 `telemetry_events`（已存在；Phase 1b 加列）

```sql
-- 现状（来自 server/migrations/011_telemetry_events.sql）
create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  event_name text not null,
  route_path text,
  duration_ms integer,
  metadata jsonb,
  client_at timestamptz,
  created_at timestamptz not null default now()
);

-- Phase 1b 追加（server/migrations/013_telemetry_events_context.sql）
alter table public.telemetry_events add column if not exists session_id text;
alter table public.telemetry_events add column if not exists app_version text;
alter table public.telemetry_events add column if not exists commit_sha text;
create index if not exists idx_telemetry_events_session
  on public.telemetry_events (session_id, created_at desc);
```

### 9.2 `weekly_reports`（Phase 2 新建，PG 主数据源）

```sql
-- server/migrations/014_weekly_reports.sql
create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_id text not null unique,          -- e.g. '2026-W22'
  week_start_date date not null,
  week_end_date date not null,
  status text not null default 'final',  -- 'draft' | 'final'
  metrics_json jsonb not null,
  analysis_md text,                      -- AI 原因分析
  recommendations_md text,               -- 优化建议
  report_md text not null,               -- 完整 markdown 周报
  report_path text,                      -- e.g. 'docs/reports/weekly/2026-W22.md'
  generated_by text not null,            -- 'cron' | 'cli' | 'manual' | 'mock'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_weekly_reports_week on public.weekly_reports (week_id);
```

写入策略：

- cron / regenerate：`on conflict (week_id) do update set ... , updated_at = now()`
- `--force` 在 `scripts/weekly-telemetry-report.mjs` 内只影响是否调 regenerate API，DB 层始终幂等

## 10. metadata 白名单（前后端双侧强制）

| 字段 | 允许值 / 类型 | 说明 |
|------|---------------|------|
| `input_length` | int | 输入字数（不含原文）|
| `input_mode` | `'ai'` \| `'manual'` \| `'template'` \| `'default_estimate'` | 估算来源 |
| `route_from` | string ≤ 200 | URL path，不含 query string |
| `route_to` | string ≤ 200 | URL path |
| `duration_ms` | int ≥ 0 | 耗时 |
| `status` | `'ok'` \| `'error'` \| `'timeout'` \| `'saved'` | 终态 |
| `error_type` | `'timeout'` \| `'error'` \| `'network'` \| `'parse'` | 错误分类 |
| `kind` | `'exercise'` \| `'meal'` | 业务品类（用于区分餐/运动 AI 估算成功率） |

**禁止**记录：饮食文本 / 体重 / 身体数据 / 备注 / 任何 PII。
前端 `trackMetric` 在 `metadata` 入口处 pick 白名单字段；后端 `normalizeEvent` 在写库前再 pick 一遍兜底。

**清理**：随白名单收紧，移除以下旧触发点：

- `server/src/routes/ai.js#writeAiTelemetry` 及其调用（`ai_estimate_server_ok/fail` 不再在本期记录；如需服务端 AI 耗时观测，按 §5 Non-goals 另立 milestone）
- `src/pages/LogPage.tsx` 的 `trackEvent({ name: 'log_save_success' })` 与 `log_save_failure` 触发（被 `ai_estimate_fallback_complete` 状态机替代）

## 11. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 前端事件 → `POST /telemetry/events`（登录用户） | 写入 `telemetry_events` |
| 后端 cron 周一 02:00 → 读 `telemetry_events` 近 7 日 + 上一周环比 | 写入 `weekly_reports` 一行 |
| Admin GET `/telemetry/weekly-reports[/:week]` | JSON / markdown |
| Admin POST `/telemetry/weekly-reports/:week/regenerate` | 重新跑后返回新内容 |
| CLI `pull-weekly-report.mjs <week>` | 写 `docs/reports/weekly/<week>.md` |
| CLI `weekly-telemetry-report.mjs --mock` | stdout 一份示意 markdown |

### 11.1 周报必含 8 段（`composeMetricsMarkdown` + `explainWithDeepSeek` 共同产出）

1. **本周结论**（一句话）
2. **核心指标**（表格：route_change/page_load P50/P95、AI 总量/成功/超时/错误/成功率/超时率/fallback 完成率；含同环比）
3. **异常路由**（最慢 `route_from → route_to` 路径 Top 5）
4. **页面加载分析**（最慢页面、对比上一周）
5. **AI 估算分析**（成功率、超时率、fallback 完成率、各错误类型分布）
6. **可能原因**（DeepSeek 生成；严谨措辞）
7. **优化建议**（DeepSeek 生成；可行的代码/UX 改动方向）
8. **下周验证目标**（量化目标，例如「下周 route_change P95 ≤ 800ms」）

### 11.2 AI 解读表达规范（写入 DeepSeek prompt）

强制要求模型使用"初步怀疑 / 需要结合 Network 面板或后端接口耗时进一步验证"
等可证伪表达，**禁止**单一因果断言（如「因为接口慢，所以页面卡」）。
Prompt 最后追加几条 few-shot：

> 推荐："观察到社区页切换 P95 偏高，初步怀疑与全量数据重新请求和全屏 loading 有关，需要结合 Network 面板或后端接口耗时进一步验证。"
> 不要写："因为接口慢，所以页面卡。"

## 12. Edge cases

- **DeepSeek 失败 / 超时 / 401 / 余额不足**：`analysis_md` / `recommendations_md` 留占位「AI 解读不可用：&lt;原因&gt;。请人工补充」；`report_md` 仍含完整指标表；`status` 标 `draft`，admin 可手动 regenerate。
- **样本不足**：任一指标 `count < 5` 直接标"数据不足"，**不**喂给 DeepSeek（避免 hallucinate）；可能原因/优化建议段输出"本周样本不足"。
- **`ADMIN_EMAILS` 未配**：所有 admin 接口返回 403；普通用户访问也是 403；前端可隐藏入口（仅体验优化，**不是安全边界**）。
- **同一 `week_id` 重复跑**：cron 默认 skip；regenerate / `--force` 走 upsert。
- **Cron 在容器重启时打断**：node-cron 在进程启动时重新注册下一次触发；重复触发由 `week_id` upsert 兜底。
- **时区**：cron 与 SQL 都对齐 `Asia/Shanghai`（`process.env.TZ` 已是 UTC 时用 `(now() at time zone 'Asia/Shanghai')`）。
- **前端 sendBeacon 不支持**：回退 `fetch(... { keepalive: true })`；都失败时静默丢弃，不重试不报错。
- **前端 session_id 跨标签页**：使用 `sessionStorage`，每个 tab 一个；不跨 tab 合并（避免维护状态）。

## 13. 涉及文件 / 模块（预期）

### Phase 1b（埋点修正）

**后端**

- `server/migrations/013_telemetry_events_context.sql`（新）
- `server/src/db.js`（追加幂等 DDL）
- `server/src/telemetry.js`（事件白名单收紧 + 新字段透传）
- `server/src/routes/telemetry.js`（`normalizeEvent` 新字段 + metadata 白名单 pick）

**前端**

- `src/lib/telemetry.ts`：metadata 白名单 pick + session_id 生成 + sendBeacon 优先 + 事件名收紧；导出 `trackMetric` 作为公开 API
- `src/components/AiKcalEstimate.tsx`：触发 `ai_estimate_success/timeout/error`，写白名单 metadata
- `src/pages/LogPage.tsx`：保存成功钩子 + fallback 状态机；触发 `ai_estimate_fallback_complete`
- `src/components/TelemetryListener.tsx`：page_load / route_change metadata 收敛到白名单
- `index.html` 或 `vite.config.ts`：注入 `VITE_APP_VERSION`、`VITE_COMMIT_SHA`（CI 写入）

**文档**

- `docs/architecture/api-contract.md`（事件白名单更新；新字段说明）
- `docs/architecture/overview.md` ER 节追加 `telemetry_events` 新列
- `docs/metrics/frontend-metrics-design.md`（在 Phase 1b 就建立，Phase 2 继续扩充）

### Phase 2（周报）

**后端**

- `server/migrations/014_weekly_reports.sql`（新）
- `server/src/db.js`（追加幂等 DDL）
- `server/src/weeklyReport.js`（新）
- `server/src/scheduler.js`（新；node-cron 唯一入口）
- `server/src/auth.js`（追加 `requireAdmin`）
- `server/src/routes/telemetry.js`（扩展 3 个新路由）
- `server/src/index.js`（启动时 `startSchedulers()`）
- `server/package.json`（新增依赖 `node-cron`）

**脚本**

- `scripts/weekly-telemetry-report.mjs`（开发/手动；支持 `--mock`）
- `scripts/pull-weekly-report.mjs <week>`（CLI 拉接口写文件，含 `--force`）

**文档**

- `docs/metrics/weekly-report-template.md`（新）
- `docs/reports/weekly/README.md`（新）
- `docs/architecture/api-contract.md`（追加 3 个 admin 路由）
- `docs/architecture/overview.md` ER 追加 `weekly_reports`
- `deploy/.env.example` 追加 `ADMIN_EMAILS=`
- 根 `README.md` 「功能」节追加一行
- 本 milestone（status: done）+ `docs/milestones/README.md` 索引更新

## 14. 实施步骤（拆分为 2 个 PR）

### PR 1：`feat/telemetry-l4-tighten`（Phase 1b）

依赖：`feat/infra-e2e-telemetry` 已 merge 到 main。

1. 创建分支 `feat/telemetry-l4-tighten`（从最新 main）
2. Migration 013 + db.js DDL
3. 后端事件白名单收紧 + `normalizeEvent` 加新字段透传 + metadata 白名单 pick
4. 前端 `trackMetric` 重构：白名单、sendBeacon、session_id、commit_sha/app_version 注入
5. 触发点改造：`AiKcalEstimate`、`LogPage` 的 fallback 状态机、`TelemetryListener` metadata 收敛
6. 文档：`api-contract` + `overview` ER + `docs/metrics/frontend-metrics-design.md`
7. Smoke：lint、typecheck、build、`node --check`
8. 走 `03-commit-and-push` confirm gate

### PR 2：`feat/telemetry-weekly-report`（Phase 2）

依赖：PR 1 已 merge。

1. 创建分支 `feat/telemetry-weekly-report`（从最新 main，PR1 已并入）
2. Migration 014 + db.js DDL；安装 `node-cron`
3. `weeklyReport.js` 纯函数 + DeepSeek 适配（降级路径完整）
4. `routes/telemetry.js` 扩展 3 个 admin 路由 + `requireAdmin`
5. `scheduler.js` + `index.js#startSchedulers()`
6. `scripts/weekly-telemetry-report.mjs --mock`
7. `scripts/pull-weekly-report.mjs <week> [--force]`
8. 文档：`docs/metrics/weekly-report-template.md`、`docs/reports/weekly/README.md`、`api-contract`、`overview` ER、`deploy/.env.example`、根 README
9. Smoke：以上全套 + `node scripts/weekly-telemetry-report.mjs --mock`
10. 走 `03-commit-and-push` confirm gate

## 15. 测试方案

- 单元测试：`server/test/weeklyReport.test.js`
  - `computeWeeklyMetrics`：mock events → 校验 P50/P95、各 rate、阈值兜底
  - `composeMetricsMarkdown`：包含 8 段标题
  - `explainWithDeepSeek`：通过 `globalThis.fetch` mock；超时 / 401 / 解析失败均走降级
- Smoke：
  - `npm run lint`、`npm run typecheck`、`npm run build`
  - `node --check server/src/index.js`
  - `node scripts/weekly-telemetry-report.mjs --mock` 输出含 8 段
  - admin curl 三个新路由（含 regenerate）；普通用户 403
  - 浏览器无 token 情况下 `trackMetric` 不抛错
- 手动验证：
  - 本地用 admin 邮箱登录，跑 `scripts/pull-weekly-report.mjs 2026-W21`，看 `docs/reports/weekly/` 是否生成且不含 PII
  - 模拟 AI 超时（断网 / 在 mock server 上让 deepseek 接口慢）→ 完成保存 → 数据库 `telemetry_events` 应有 `ai_estimate_timeout` + `ai_estimate_fallback_complete`

## 16. 风险与缓解

| Risk | Mitigation |
|------|------------|
| DeepSeek 不稳 / 超时 / 余额耗尽 → 周报无 AI 解读 | `explainWithDeepSeek` try-catch；失败 `analysis_md/recommendations_md` 用占位段，`status` 标 `draft`，admin 可 regenerate |
| Cron 容器重启时重复触发 | `week_id` 唯一约束 + upsert；同一 week 默认 skip，需要 `--force` 才覆盖 |
| 数据量小造成误读 | 单指标 `count < 5` 标"数据不足"；不喂给 DeepSeek |
| Admin 邮箱泄露 / 误配 | `ADMIN_EMAILS` 在 `.env`，**不入仓**；登录 + 邮箱白名单双重校验；接口返回**只含聚合数字 + AI 解读 markdown**，零 PII |
| metadata 字段被业务代码误塞用户原文 | 前后端双层 pick 白名单；后端 `normalizeEvent` 默认丢弃白名单外字段；CI 加 grep 检查也可考虑（后续） |
| 现有 PR `feat/infra-e2e-telemetry` 未合并就引用新白名单 | PR 1（tighten）显式声明对其的依赖；先等 Phase 1a merge 再起 PR 1 |
| AI 表达写出强因果断言误导决策 | Prompt 中强制 few-shot 推荐/不推荐表达；规范写入 `weekly-report-template.md` 由审阅者把关 |

## 17. 文档同步计划（合并前必须完成）

- [ ] `docs/architecture/api-contract.md`：事件白名单更新 + 3 个 admin 路由 + 鉴权说明
- [ ] `docs/architecture/overview.md` ER 节：`telemetry_events` 新列 + `weekly_reports` 新表
- [ ] `docs/metrics/frontend-metrics-design.md`（新）
- [ ] `docs/metrics/weekly-report-template.md`（新）
- [ ] `docs/reports/weekly/README.md`（新）
- [ ] `deploy/.env.example`：追加 `ADMIN_EMAILS=`
- [ ] 根 `README.md`「功能」节：追加一行半自动周报
- [ ] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 18. 回滚方案

- **代码**：`git revert <PR-merge-sha>`
- **DB**：`weekly_reports`、`telemetry_events.session_id/app_version/commit_sha` 保留（追加历史/列，不影响业务）
- **Cron**：删 `scheduler.js` 注册即停；或 `.env` `WEEKLY_REPORT_DISABLED=1` 让 `startSchedulers()` 跳过
- **前端**：`trackMetric` 全局开关 `VITE_TELEMETRY_DISABLED=1` 可立即停采

## 19. 是否满足最小可运行闭环

是——后端自动跑、admin 自动取、本地一行命令进 docs、PR 走正常审核。
没有前端 UI、没有外部 push、没有自动 commit、没有 PII，符合「轻量 + PG 主存储 + docs 沉淀」的定位。

## 20. 验收报告清单（PR 合并前在 PR 描述中逐条回答）

1. 新增 / 修改了哪些文件
2. 数据库 migration 做了什么（013 / 014 分别变更）
3. `telemetry_events` 现在记录哪些事件（6 个白名单 + 新字段）
4. `weekly_reports` 如何生成（cron / regenerate / mock 路径）
5. 哪些 API 普通用户可用（`POST /telemetry/events`）
6. 哪些 API 是 admin only（3 个 weekly-reports 路由）
7. `ADMIN_EMAILS` 如何配置（`.env` 逗号分隔；不入仓）
8. 如何手动生成 mock 周报（`node scripts/weekly-telemetry-report.mjs --mock`）
9. 如何拉取周报到 docs（`node scripts/pull-weekly-report.mjs <week>`）
10. 哪些敏感数据没有被采集（饮食文本 / 体重 / 身体数据 / 备注 / 任何 PII，metadata 白名单兜底）
11. 后续 M5 dashboard 可以怎么接入（直接读 `weekly_reports.metrics_json` 出图；事件层读 `telemetry_events` 加 `session_id` 维度）

## 21. 本功能定位（守好边界）

> 这不是用户侧功能，也不是增长功能，而是「轻量前端体验观测 + 每周质量复盘」。
> 目标是让项目从「凭感觉修交互问题」变成：
> 发现问题 → 埋点记录 → 每周聚合 → AI 辅助解释 → 给出优化建议 → 下周验证指标是否改善。

不扩范围到复杂 BI、复杂 dashboard、复杂 A/B testing。第一版只保证「链路简单、稳定、可复用」。

---

## 附：决策日志（4 维度反思）

- **需求自洽**：Goal 与 §3 原则一致；§4 验收条目逐条可勾；§5 Non-goals 明确划出复杂 BI / 看板 / 容器 push / 匿名上报 / role 列。
- **架构合理**：复用 `dateKey.js`、DeepSeek 套路、`asyncHandler`、`authMiddleware`、`apiFetch`；新增 `requireAdmin`、`scheduler.js`、`weeklyReport.js` 三个最小切口；事件白名单收紧而非扩张；不引入新 SDK / 新分析平台。
- **工程闭环**：migration → service → route → cron → CLI → docs 全部在 §13 范围内；单元/烟雾/手动测试在 §15 覆盖；依赖只新增 `node-cron`；前端零新依赖。
- **风险可控**：Top 6 风险（DeepSeek 不稳 / cron 重复 / 样本不足 / Admin 邮箱泄露 / metadata 误塞 PII / 现有 PR 依赖 / AI 强因果断言）在 §16 都有显式缓解；回滚 §18 全路径覆盖；admin 鉴权基于现有 JWT 邮箱，无迁移。

