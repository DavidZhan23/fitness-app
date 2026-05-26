#!/usr/bin/env node
/**
 * scripts/weekly-telemetry-report.mjs
 *
 * 开发 / 手动触发版的周报生成工具。
 *
 * 使用方式：
 *   node scripts/weekly-telemetry-report.mjs --mock          # 不连 DB，输出 demo 报告到 stdout
 *   node scripts/weekly-telemetry-report.mjs [--week 2026-W22]  # 连接真实 DB 生成周报
 *
 * 环境变量（真实 DB 模式需要）：
 *   DATABASE_URL=postgres://...
 *   DEEPSEEK_API_KEY=...（可选，不填则跳过 AI 解读）
 *   DISPLAY_TIMEZONE=Asia/Shanghai（默认）
 */

import { parseArgs } from 'node:util'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const { values: args } = parseArgs({
  options: {
    mock: { type: 'boolean', default: false },
    week: { type: 'string' },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
})

if (args.help) {
  console.log(`
Usage:
  node scripts/weekly-telemetry-report.mjs --mock
  node scripts/weekly-telemetry-report.mjs [--week 2026-W22] [--force]

Options:
  --mock          Generate demo report without DB / DeepSeek
  --week <id>     Target week (default: last completed week)
  --force         Overwrite existing report in DB
  -h, --help      Show this help
`)
  process.exit(0)
}

// ─── Mock 模式 ─────────────────────────────────────────────────────
if (args.mock) {
  // 加载 server/src/weeklyReport.js（不启动 Express，不连 DB）
  // 由于是 ESM，直接用 import()
  const { generateMockReport, getIsoWeekKey } = await import(
    path.resolve(__dirname, '../server/src/weeklyReport.js')
  )

  // 设置占位环境变量避免 deepseekKcal 因缺少 JWT_SECRET 等而抛错
  process.env.DATABASE_URL ??= 'postgres://mock:mock@localhost:5432/mock'
  process.env.JWT_SECRET ??= 'mock_secret_for_dry_run_only_not_real'

  const weekId = args.week ?? getIsoWeekKey(new Date(Date.now() - 7 * 86_400_000))
  const report = generateMockReport(weekId)

  console.log(report)
  console.error(`\n✔ Mock report for ${weekId} printed to stdout`)
  process.exit(0)
}

// ─── 真实 DB 模式 ──────────────────────────────────────────────────
const dotenvPath = path.resolve(__dirname, '../server/.env')
try {
  const { config } = await import('dotenv')
  config({ path: dotenvPath })
} catch {
  /* dotenv optional */
}

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set. Run with --mock or set DATABASE_URL.')
  process.exit(1)
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'cli_placeholder_not_used_for_auth'
}

const { query, waitForDb } = await import(
  path.resolve(__dirname, '../server/src/db.js')
)
const { generateWeeklyReport, getIsoWeekKey } = await import(
  path.resolve(__dirname, '../server/src/weeklyReport.js')
)

const weekId =
  args.week ?? getIsoWeekKey(new Date(Date.now() - 7 * 86_400_000))

console.error(`Connecting to DB...`)
await waitForDb(5, 2000)

console.error(`Generating weekly report for ${weekId} (force=${args.force})...`)
const result = await generateWeeklyReport(weekId, query, {
  force: args.force,
  generatedBy: 'cli',
})

if (!result) {
  console.error(
    `Report for ${weekId} already exists. Use --force to regenerate.`,
  )
} else {
  console.log(result.report_md)
  console.error(
    `\n✔ Report saved to DB: ${weekId} (status=${result.status}, ai_ok=${result.ai_ok})`,
  )
}

process.exit(0)
