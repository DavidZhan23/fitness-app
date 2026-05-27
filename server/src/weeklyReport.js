/**
 * 每周质量报告：指标聚合 + markdown 生成 + DeepSeek AI 解读
 *
 * 所有函数均为纯函数（除 explainWithDeepSeek 需要网络），可单独单测。
 */

import { getDeepSeekApiKey } from './ai/providers/deepseekText.js'

const TZ = process.env.DISPLAY_TIMEZONE || 'Asia/Shanghai'
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const DEEPSEEK_TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 30_000)

/** 样本量低于此值则标"数据不足"，不喂给 DeepSeek */
const MIN_SAMPLE = 5

// ─── 日期 / 周 工具 ──────────────────────────────────────────────

/**
 * 返回 ISO 8601 周 key，例如 "2026-W22"（周一为起点，Asia/Shanghai）
 * @param {Date} d
 */
export function getIsoWeekKey(d = new Date()) {
  const inTz = new Date(d.toLocaleString('en-US', { timeZone: TZ }))
  const jan4 = new Date(inTz.getFullYear(), 0, 4)
  const startOfW1 = new Date(jan4)
  startOfW1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))

  const diffDays = Math.round((inTz - startOfW1) / 86_400_000)
  const weekNum = Math.floor(diffDays / 7) + 1
  const year =
    weekNum > 52 && inTz.getMonth() === 0
      ? inTz.getFullYear() - 1
      : weekNum === 0
        ? inTz.getFullYear() - 1
        : inTz.getFullYear()

  const finalWeek =
    weekNum === 0
      ? getIsoWeekNumber(new Date(inTz.getFullYear() - 1, 11, 28))
      : weekNum > 52 && inTz.getMonth() === 0
        ? getIsoWeekNumber(new Date(inTz.getFullYear() - 1, 11, 28))
        : weekNum

  return `${year}-W${String(finalWeek).padStart(2, '0')}`
}

function getIsoWeekNumber(d) {
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfW1 = new Date(jan4)
  startOfW1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  return Math.floor((d - startOfW1) / 86_400_000 / 7) + 1
}

/**
 * 从 weekId（如 "2026-W22"）计算该周的周一和周日（UTC midnight 对齐的 Date）
 * @param {string} weekId
 * @returns {{ weekStart: Date, weekEnd: Date }}
 */
export function weekBounds(weekId) {
  const m = weekId.match(/^(\d{4})-W(\d{2})$/)
  if (!m) throw new Error(`Invalid weekId: ${weekId}`)
  const year = parseInt(m[1], 10)
  const week = parseInt(m[2], 10)

  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (week - 1) * 7)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  return { weekStart: monday, weekEnd: sunday }
}

// ─── 指标聚合 ─────────────────────────────────────────────────────

/**
 * 从 telemetry_events 行数组计算本周指标。
 *
 * @param {Array<{
 *   event_name: string,
 *   duration_ms: number|null,
 *   metadata: Record<string,unknown>|null
 * }>} events
 * @param {Array<{
 *   event_name: string,
 *   duration_ms: number|null
 * }>} prevEvents  上一周事件（用于环比，可为空数组）
 * @returns {WeeklyMetrics}
 */
export function computeWeeklyMetrics(events, prevEvents = []) {
  const routeEvents = events.filter(
    (e) => e.event_name === 'route_change' && e.duration_ms != null,
  )
  const pageEvents = events.filter(
    (e) => e.event_name === 'page_load' && e.duration_ms != null,
  )

  const aiSuccess = events.filter(
    (e) => e.event_name === 'ai_estimate_success',
  ).length
  const aiTimeout = events.filter(
    (e) => e.event_name === 'ai_estimate_timeout',
  ).length
  const aiError = events.filter(
    (e) => e.event_name === 'ai_estimate_error',
  ).length
  const aiTotal = aiSuccess + aiTimeout + aiError
  const fallback = events.filter(
    (e) => e.event_name === 'ai_estimate_fallback_complete',
  ).length
  const aiFailed = aiTimeout + aiError

  const routeP = percentiles(routeEvents.map((e) => e.duration_ms))
  const pageP = percentiles(pageEvents.map((e) => e.duration_ms))

  const prevRouteEvents = prevEvents.filter(
    (e) => e.event_name === 'route_change' && e.duration_ms != null,
  )
  const prevPageEvents = prevEvents.filter(
    (e) => e.event_name === 'page_load' && e.duration_ms != null,
  )
  const prevAiSuccess = prevEvents.filter(
    (e) => e.event_name === 'ai_estimate_success',
  ).length
  const prevAiTotal =
    prevAiSuccess +
    prevEvents.filter((e) => e.event_name === 'ai_estimate_timeout').length +
    prevEvents.filter((e) => e.event_name === 'ai_estimate_error').length

  const prevRouteP = percentiles(prevRouteEvents.map((e) => e.duration_ms))
  const prevPageP = percentiles(prevPageEvents.map((e) => e.duration_ms))

  const topRoutes = computeTopSlowRoutes(routeEvents)

  return {
    route_change: {
      count: routeEvents.length,
      p50: routeP.p50,
      p95: routeP.p95,
      wow_p95: wowDiff(routeP.p95, prevRouteP.p95),
      top_slow: topRoutes,
    },
    page_load: {
      count: pageEvents.length,
      p50: pageP.p50,
      p95: pageP.p95,
      wow_p95: wowDiff(pageP.p95, prevPageP.p95),
      top_slow: computeTopSlowPages(pageEvents),
    },
    ai_estimate: {
      total: aiTotal,
      success: aiSuccess,
      timeout: aiTimeout,
      error: aiError,
      fallback_total: aiFailed,
      fallback_complete: fallback,
      success_rate: aiTotal >= MIN_SAMPLE ? rate(aiSuccess, aiTotal) : null,
      timeout_rate: aiTotal >= MIN_SAMPLE ? rate(aiTimeout, aiTotal) : null,
      fallback_rate:
        aiFailed >= MIN_SAMPLE ? rate(fallback, aiFailed) : null,
      wow_success_rate: wowDiff(
        aiTotal >= MIN_SAMPLE ? rate(aiSuccess, aiTotal) : null,
        prevAiTotal >= MIN_SAMPLE ? rate(prevAiSuccess, prevAiTotal) : null,
      ),
    },
  }
}

function percentiles(values) {
  if (values.length < MIN_SAMPLE) return { p50: null, p95: null }
  const sorted = [...values].filter((v) => v != null).sort((a, b) => a - b)
  return {
    p50: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
  }
}

function rate(numerator, denominator) {
  if (!denominator) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function wowDiff(current, prev) {
  if (current == null || prev == null || prev === 0) return null
  return Math.round(((current - prev) / prev) * 1000) / 10
}

function computeTopSlowRoutes(events, topN = 5) {
  const map = {}
  for (const e of events) {
    const from = e.metadata?.route_from ?? '?'
    const to = e.metadata?.route_to ?? e.route_path ?? '?'
    const key = `${from} → ${to}`
    if (!map[key]) map[key] = []
    map[key].push(e.duration_ms)
  }
  return Object.entries(map)
    .map(([path, durations]) => {
      const sorted = [...durations].sort((a, b) => a - b)
      return {
        path,
        count: durations.length,
        p95: sorted.length >= 2
          ? Math.round(sorted[Math.floor(sorted.length * 0.95)])
          : Math.round(sorted[sorted.length - 1] ?? 0),
      }
    })
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, topN)
}

function computeTopSlowPages(events, topN = 5) {
  const map = {}
  for (const e of events) {
    const route = e.metadata?.route_to ?? e.route_path ?? '?'
    if (!map[route]) map[route] = []
    map[route].push(e.duration_ms)
  }
  return Object.entries(map)
    .map(([route, durations]) => {
      const sorted = [...durations].sort((a, b) => a - b)
      return {
        route,
        count: durations.length,
        p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
      }
    })
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, topN)
}

// ─── Markdown 生成 ────────────────────────────────────────────────

/**
 * 将指标对象转换为 §2–§5 的核心指标 + 路由/页面/AI 分析表格（无 AI 解读部分）
 * @param {WeeklyMetrics} metrics
 * @param {string} weekId
 */
export function composeMetricsMarkdown(metrics, weekId) {
  const { route_change: rc, page_load: pl, ai_estimate: ai } = metrics
  const na = 'N/A（数据不足）'

  function fmtMs(v) {
    return v == null ? na : `${v} ms`
  }
  function fmtRate(v) {
    return v == null ? na : `${v}%`
  }
  function fmtWow(v) {
    if (v == null) return '—'
    const sign = v > 0 ? '+' : ''
    return `${sign}${v}%`
  }
  function fmtCount(v) {
    return v == null ? na : String(v)
  }

  const lines = []

  lines.push(`## 2. 核心指标`)
  lines.push(``)
  lines.push(`### 路由切换`)
  lines.push(`| 指标 | 本周 | 环比 |`)
  lines.push(`|------|------|------|`)
  lines.push(
    `| 次数 | ${fmtCount(rc.count)} | — |`,
  )
  lines.push(
    `| P50 | ${fmtMs(rc.p50)} | — |`,
  )
  lines.push(
    `| P95 | ${fmtMs(rc.p95)} | ${fmtWow(rc.wow_p95)} |`,
  )

  lines.push(``)
  lines.push(`### 页面加载`)
  lines.push(`| 指标 | 本周 | 环比 |`)
  lines.push(`|------|------|------|`)
  lines.push(`| 次数 | ${fmtCount(pl.count)} | — |`)
  lines.push(`| P50 | ${fmtMs(pl.p50)} | — |`)
  lines.push(`| P95 | ${fmtMs(pl.p95)} | ${fmtWow(pl.wow_p95)} |`)

  lines.push(``)
  lines.push(`### AI 估算`)
  lines.push(`| 指标 | 本周 | 环比 |`)
  lines.push(`|------|------|------|`)
  lines.push(`| 总量 | ${fmtCount(ai.total)} | — |`)
  lines.push(`| 成功 | ${fmtCount(ai.success)} | — |`)
  lines.push(`| 超时 | ${fmtCount(ai.timeout)} | — |`)
  lines.push(`| 错误 | ${fmtCount(ai.error)} | — |`)
  lines.push(
    `| 成功率 | ${fmtRate(ai.success_rate)} | ${fmtWow(ai.wow_success_rate)} |`,
  )
  lines.push(`| 超时率 | ${fmtRate(ai.timeout_rate)} | — |`)
  lines.push(
    `| Fallback 完成率 | ${fmtRate(ai.fallback_rate)} | — |`,
  )

  lines.push(``)
  lines.push(`## 3. 异常路由（P95 Top 5）`)
  lines.push(``)
  if (rc.top_slow.length === 0) {
    lines.push(`> 本周样本不足，暂无异常路由数据。`)
  } else {
    lines.push(`| 路径 | 次数 | P95 |`)
    lines.push(`|------|------|-----|`)
    for (const r of rc.top_slow) {
      lines.push(`| \`${r.path}\` | ${r.count} | ${r.p95} ms |`)
    }
  }

  lines.push(``)
  lines.push(`## 4. 页面加载分析`)
  lines.push(``)
  if (pl.top_slow.length === 0) {
    lines.push(`> 本周样本不足，暂无页面加载分析数据。`)
  } else {
    lines.push(`| 页面 | 次数 | P95 |`)
    lines.push(`|------|------|-----|`)
    for (const p of pl.top_slow) {
      lines.push(`| \`${p.route}\` | ${p.count} | ${p.p95} ms |`)
    }
  }

  lines.push(``)
  lines.push(`## 5. AI 估算分析`)
  lines.push(``)
  if (ai.total < MIN_SAMPLE) {
    lines.push(`> 本周 AI 估算事件不足 ${MIN_SAMPLE} 条，分析仅供参考。`)
    lines.push(``)
  }
  lines.push(
    `- 本周共发起 AI 估算 **${ai.total}** 次：成功 ${ai.success}、超时 ${ai.timeout}、错误 ${ai.error}。`,
  )
  if (ai.fallback_total > 0) {
    lines.push(
      `- AI 未成功后用户仍完成打卡（fallback complete）**${ai.fallback_complete}** / ${ai.fallback_total} 次（${fmtRate(ai.fallback_rate)}）。`,
    )
  }

  return lines.join('\n')
}

/**
 * 组装完整 report_md（含 AI 解读占位或真实内容）
 */
export function buildReportMd({
  weekId,
  weekStart,
  weekEnd,
  metrics,
  metricsMarkdown,
  analysis_md,
  recommendations_md,
}) {
  const fmtDate = (d) =>
    new Date(d).toISOString().slice(0, 10)

  const conclusion = deriveSummaryLine(metrics)

  return [
    `# 每周质量报告 ${weekId}`,
    ``,
    `> 时间范围：${fmtDate(weekStart)} – ${fmtDate(weekEnd)}  `,
    `> 生成方式：自动聚合 + DeepSeek AI 解读  `,
    `> 数据来源：PostgreSQL \`telemetry_events\``,
    ``,
    `## 1. 本周结论`,
    ``,
    conclusion,
    ``,
    metricsMarkdown,
    ``,
    `## 6. 可能原因`,
    ``,
    analysis_md ||
      `> AI 解读不可用（DeepSeek 未响应或余额不足），请人工补充。`,
    ``,
    `## 7. 优化建议`,
    ``,
    recommendations_md ||
      `> AI 建议不可用，请人工补充。`,
    ``,
    `## 8. 下周验证目标`,
    ``,
    deriveNextWeekTargets(metrics),
    ``,
    `---`,
    ``,
    `*本报告由 fitness-app 后端自动生成，AI 解读仅供参考，需结合 Network 面板或后端日志验证。*`,
  ].join('\n')
}

function deriveSummaryLine(metrics) {
  const parts = []
  const rc = metrics.route_change
  const ai = metrics.ai_estimate

  if (rc.p95 != null) {
    const level = rc.p95 > 1500 ? '偏高' : rc.p95 > 800 ? '中等' : '良好'
    parts.push(`路由切换 P95 **${rc.p95} ms**（${level}）`)
  }
  if (ai.success_rate != null) {
    const level = ai.success_rate < 70 ? '偏低' : ai.success_rate < 90 ? '中等' : '良好'
    parts.push(`AI 估算成功率 **${ai.success_rate}%**（${level}）`)
  }

  if (parts.length === 0) return '> 本周数据量不足，暂无结论。'
  return `> ${parts.join('；')}。`
}

function deriveNextWeekTargets(metrics) {
  const lines = []
  const rc = metrics.route_change
  const ai = metrics.ai_estimate

  if (rc.p95 != null && rc.p95 > 800) {
    const target = Math.round(rc.p95 * 0.85)
    lines.push(`- [ ] route_change P95 下降至 ≤ ${target} ms`)
  }
  if (ai.success_rate != null && ai.success_rate < 90) {
    const target = Math.min(99, Math.round(ai.success_rate + 5))
    lines.push(`- [ ] AI 估算成功率提升至 ≥ ${target}%`)
  }
  if (ai.fallback_rate != null && ai.fallback_rate < 70) {
    lines.push(`- [ ] AI fallback 完成率提升至 ≥ 70%（减少因 AI 失败导致用户放弃打卡）`)
  }

  return lines.length > 0
    ? lines.join('\n')
    : '- [ ] 维持本周水平，继续观察数据趋势。'
}

// ─── DeepSeek AI 解读 ─────────────────────────────────────────────

const AI_ANALYSIS_PROMPT = `你是 fitness-app 工程质量分析师。
根据以下本周前端体验指标，分析"可能原因"。

要求：
1. 使用严谨的可证伪表达，如"初步怀疑……需要结合 Network 面板或后端接口耗时进一步验证"。
2. 禁止使用单一强因果断言，如"因为接口慢，所以页面卡"。
3. 如果数据不足（标注 N/A），指出不足并说明需要收集哪些信息。
4. 回复只包含分析内容，不加任何前缀。
5. 字数控制在 200 字以内。

指标如下：
`

const AI_RECS_PROMPT = `你是 fitness-app 工程质量顾问。
根据以下前端体验指标和可能原因，给出 3 条可落地的优化建议。

要求：
1. 每条建议包含具体的验证方法或代码改动方向。
2. 优先级从高到低排列。
3. 回复只包含建议列表，不加任何前缀或解释。

`

/**
 * 调用 DeepSeek 生成 AI 解读，失败时降级为占位文本。
 * @param {WeeklyMetrics} metrics
 * @param {string} metricsMarkdown
 * @returns {Promise<{ analysis_md: string, recommendations_md: string, ai_ok: boolean }>}
 */
export async function explainWithDeepSeek(metrics, metricsMarkdown) {
  const apiKey = getDeepSeekApiKey()
  if (!apiKey) {
    return {
      analysis_md: null,
      recommendations_md: null,
      ai_ok: false,
    }
  }

  try {
    const [analysis, recs] = await Promise.all([
      callDeepSeek(AI_ANALYSIS_PROMPT + metricsMarkdown, apiKey),
      callDeepSeek(AI_RECS_PROMPT + metricsMarkdown, apiKey),
    ])
    return {
      analysis_md: analysis,
      recommendations_md: recs,
      ai_ok: true,
    }
  } catch (err) {
    console.warn('[weeklyReport] DeepSeek explain failed:', err.message)
    return {
      analysis_md: null,
      recommendations_md: null,
      ai_ok: false,
    }
  }
}

async function callDeepSeek(prompt, apiKey) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS)
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        max_tokens: 512,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`DeepSeek HTTP ${res.status}: ${data?.error?.message ?? ''}`)
    }
    const content = data?.choices?.[0]?.message?.content ?? ''
    if (!content.trim()) throw new Error('DeepSeek returned empty content')
    return content.trim()
  } finally {
    clearTimeout(timer)
  }
}

// ─── 主入口（供 cron / regenerate / CLI 调用）──────────────────────

/**
 * 为指定 weekId 生成完整周报，写入 DB（upsert）
 *
 * @param {string} weekId  e.g. "2026-W22"
 * @param {import('./db.js').query} queryFn
 * @param {{ force?: boolean, generatedBy?: string }} opts
 */
export async function generateWeeklyReport(weekId, queryFn, opts = {}) {
  const { force = false, generatedBy = 'cron' } = opts

  if (!force) {
    const { rows } = await queryFn(
      `select id from weekly_reports where week_id = $1`,
      [weekId],
    )
    if (rows.length > 0) {
      console.log(`[weeklyReport] ${weekId} already exists, skipping (use force to regenerate)`)
      return null
    }
  }

  const { weekStart, weekEnd } = weekBounds(weekId)

  const weekStartStr = weekStart.toISOString()
  const weekEndStr = new Date(weekEnd.getTime() + 86_399_999).toISOString()

  const prevStart = new Date(weekStart)
  prevStart.setUTCDate(prevStart.getUTCDate() - 7)
  const prevEnd = new Date(weekEnd)
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 7)

  const [{ rows: events }, { rows: prevEvents }] = await Promise.all([
    queryFn(
      `select event_name, duration_ms, metadata, route_path
       from telemetry_events
       where created_at >= $1 and created_at <= $2`,
      [weekStartStr, weekEndStr],
    ),
    queryFn(
      `select event_name, duration_ms
       from telemetry_events
       where created_at >= $1 and created_at <= $2`,
      [prevStart.toISOString(), new Date(prevEnd.getTime() + 86_399_999).toISOString()],
    ),
  ])

  const metrics = computeWeeklyMetrics(events, prevEvents)
  const metricsMarkdown = composeMetricsMarkdown(metrics, weekId)
  const { analysis_md, recommendations_md, ai_ok } = await explainWithDeepSeek(
    metrics,
    metricsMarkdown,
  )

  const status = ai_ok ? 'final' : 'draft'
  const report_md = buildReportMd({
    weekId,
    weekStart,
    weekEnd,
    metrics,
    metricsMarkdown,
    analysis_md,
    recommendations_md,
  })

  const report_path = `docs/reports/weekly/${weekId}.md`

  await queryFn(
    `insert into weekly_reports
       (week_id, week_start_date, week_end_date, status, metrics_json,
        analysis_md, recommendations_md, report_md, report_path, generated_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (week_id) do update set
       status = excluded.status,
       metrics_json = excluded.metrics_json,
       analysis_md = excluded.analysis_md,
       recommendations_md = excluded.recommendations_md,
       report_md = excluded.report_md,
       report_path = excluded.report_path,
       generated_by = excluded.generated_by,
       updated_at = now()`,
    [
      weekId,
      weekStart.toISOString().slice(0, 10),
      weekEnd.toISOString().slice(0, 10),
      status,
      JSON.stringify(metrics),
      analysis_md,
      recommendations_md,
      report_md,
      report_path,
      generatedBy,
    ],
  )

  console.log(
    `[weeklyReport] generated ${weekId} (${status}, ai_ok=${ai_ok}, events=${events.length})`,
  )
  return { weekId, status, ai_ok, report_md }
}

/**
 * Mock 模式：用固定示例数据生成报告，不连 DB / DeepSeek
 * @param {string} weekId
 * @returns {string}  完整 report_md
 */
export function generateMockReport(weekId = '2026-W21') {
  const mockEvents = [
    ...Array.from({ length: 30 }, (_, i) => ({
      event_name: 'route_change',
      duration_ms: 200 + Math.floor(Math.sin(i) * 150 + Math.random() * 600),
      metadata: {
        route_from: ['/', '/log/exercise', '/community'][i % 3],
        route_to: ['/', '/log/meal', '/calendar', '/community'][i % 4],
      },
    })),
    ...Array.from({ length: 10 }, () => ({
      event_name: 'page_load',
      duration_ms: 800 + Math.floor(Math.random() * 1200),
      metadata: { route_to: ['/', '/community', '/calendar'][Math.floor(Math.random() * 3)] },
    })),
    ...Array.from({ length: 12 }, () => ({
      event_name: 'ai_estimate_success',
      duration_ms: 2000 + Math.floor(Math.random() * 8000),
      metadata: { kind: 'meal', input_mode: 'ai', input_length: 15 },
    })),
    { event_name: 'ai_estimate_timeout', duration_ms: 35000, metadata: {} },
    { event_name: 'ai_estimate_timeout', duration_ms: 35000, metadata: {} },
    { event_name: 'ai_estimate_error', duration_ms: 1200, metadata: { error_type: 'error' } },
    { event_name: 'ai_estimate_fallback_complete', duration_ms: 45000, metadata: { input_mode: 'manual' } },
    { event_name: 'ai_estimate_fallback_complete', duration_ms: 30000, metadata: { input_mode: 'template' } },
  ]

  const { weekStart, weekEnd } = weekBounds(weekId)
  const metrics = computeWeeklyMetrics(mockEvents, [])
  const metricsMarkdown = composeMetricsMarkdown(metrics, weekId)

  return buildReportMd({
    weekId,
    weekStart,
    weekEnd,
    metrics,
    metricsMarkdown,
    analysis_md:
      '（Mock 模式）观察到社区页切换 P95 偏高，初步怀疑与全量数据重新请求和全屏 loading 有关，需要结合 Network 面板或后端接口耗时进一步验证。',
    recommendations_md:
      '1. **检查社区列表接口耗时**：在 LogPage 打开时预取社区数据，避免切换到 /community 时触发阻塞式请求。\n' +
      '2. **增加 DeepSeek 重试保护**：对 35s 超时事件分析是否可将 UI 超时阈值适当放宽至 40s，或在服务端提前返回部分结果。\n' +
      '3. **监控 Fallback 完成率**：下周目标 fallback 完成率 ≥ 80%，说明用户在 AI 失败后仍成功打卡。',
  })
}

/**
 * @typedef {{
 *   route_change: { count: number, p50: number|null, p95: number|null, wow_p95: number|null, top_slow: Array<{path: string, count: number, p95: number}> },
 *   page_load: { count: number, p50: number|null, p95: number|null, wow_p95: number|null, top_slow: Array<{route: string, count: number, p95: number}> },
 *   ai_estimate: { total: number, success: number, timeout: number, error: number, fallback_total: number, fallback_complete: number, success_rate: number|null, timeout_rate: number|null, fallback_rate: number|null, wow_success_rate: number|null }
 * }} WeeklyMetrics
 */
