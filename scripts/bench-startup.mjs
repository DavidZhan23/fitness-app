#!/usr/bin/env node
/**
 * 本地启动路径耗时对比（旧瀑布 vs 当前优化）
 * 用法: node scripts/bench-startup.mjs [API_BASE]
 */
const API = process.argv[2] || 'http://localhost:3001'

async function timedFetch(url, init = {}) {
  const start = performance.now()
  const res = await fetch(url, init)
  await res.arrayBuffer()
  const ms = performance.now() - start
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${init.method || 'GET'} ${url} -> ${res.status} ${text}`)
  }
  return ms
}

async function registerUser() {
  const email = `perf-test-${Date.now()}@local.test`
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'testpass123',
      registration_key: '454676',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`register failed: ${JSON.stringify(data)}`)

  const token = data.token
  const profileRes = await fetch(`${API}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      weight_kg: 70,
      height_cm: 175,
      age: 30,
      sex: 'male',
      activity_factor: 1.375,
      onboarding_complete: true,
      bmr: 1700,
      tdee: 2300,
      deficit_threshold: 500,
    }),
  })
  if (!profileRes.ok) {
    throw new Error(`profile setup failed: ${await profileRes.text()}`)
  }

  return { token, email }
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function benchRound(token, today) {
  const auth = authHeaders(token)
  const json = { 'Content-Type': 'application/json', ...auth }

  const serialMe = await timedFetch(`${API}/auth/me`, { headers: auth })
  const serialProfile = await timedFetch(`${API}/profile`, { headers: auth })
  const serialBootstrap = serialMe + serialProfile

  const [meMs, profileMs] = await Promise.all([
    timedFetch(`${API}/auth/me`, { headers: auth }),
    timedFetch(`${API}/profile`, { headers: auth }),
  ])
  const parallelBootstrap = Math.max(meMs, profileMs)

  const getOnly = await timedFetch(`${API}/day-logs/${today}`, { headers: auth })
  const ensureMs = await timedFetch(`${API}/day-logs/ensure`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ log_date: today, tdee_snapshot: 2300 }),
  })
  const getAfterEnsure = await timedFetch(`${API}/day-logs/${today}`, { headers: auth })
  const oldDayPath = ensureMs + getAfterEnsure

  const inboxMs = await timedFetch(`${API}/community/inbox/unread`, { headers: auth })

  const oldWaterfall = serialBootstrap + inboxMs + oldDayPath
  const newCritical = parallelBootstrap + getOnly

  return { serialBootstrap, parallelBootstrap, oldDayPath, getOnly, oldWaterfall, newCritical }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

function fmt(ms) {
  return `${(ms / 1000).toFixed(3)}s`
}

function pct(saved, base) {
  if (base <= 0) return '0%'
  return `${Math.round((saved / base) * 100)}%`
}

async function main() {
  console.log(`API: ${API}\n`)

  const { token, email } = await registerUser()
  console.log(`测试账号: ${email}\n`)
  const today = new Date().toISOString().slice(0, 10)
  const ROUNDS = 8
  const rounds = []
  for (let i = 0; i < ROUNDS; i++) rounds.push(await benchRound(token, today))

  const pick = (key) => median(rounds.map((r) => r[key]))

  const serialBootstrap = pick('serialBootstrap')
  const parallelBootstrap = pick('parallelBootstrap')
  const oldDayPath = pick('oldDayPath')
  const getOnly = pick('getOnly')
  const oldWaterfall = pick('oldWaterfall')
  const newCritical = pick('newCritical')

  console.log(`（${ROUNDS} 轮中位数，localhost API）\n`)
  console.log('=== 1. 登录后 Bootstrap ===')
  console.log(`  旧：串行 /auth/me → /profile     ${fmt(serialBootstrap)}`)
  console.log(`  新：并行 /auth/me + /profile     ${fmt(parallelBootstrap)}`)
  console.log(`  节省: ${fmt(serialBootstrap - parallelBootstrap)} (${pct(serialBootstrap - parallelBootstrap, serialBootstrap)})\n`)

  console.log('=== 2. 今日页数据 ===')
  console.log(`  旧：POST ensure + GET day-log    ${fmt(oldDayPath)}`)
  console.log(`  新：仅 GET day-log               ${fmt(getOnly)}`)
  console.log(`  节省: ${fmt(oldDayPath - getOnly)} (${pct(oldDayPath - getOnly, oldDayPath)})\n`)

  console.log('=== 3. 冷启动 API 总等待（估算）===')
  console.log(`  旧：串行 bootstrap + inbox + ensure + get  ${fmt(oldWaterfall)}`)
  console.log(`  新：并行 bootstrap + 单次 get             ${fmt(newCritical)}`)
  console.log(`  节省: ${fmt(oldWaterfall - newCritical)} (${pct(oldWaterfall - newCritical, oldWaterfall)})`)
  console.log('\n说明: inbox 已延迟 2s、seed 同会话不重复；GET day-log 不再跑社区可见性同步。')
  console.log('浏览器体感还取决于 JS 下载/解析，生产包主 chunk 约 86KB gzip（原 ~102KB）。')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
