#!/usr/bin/env node
/**
 * scripts/pull-weekly-report.mjs
 *
 * 从后端 API 拉取指定周的周报 markdown，写入 docs/reports/weekly/<week>.md。
 *
 * 使用方式：
 *   node scripts/pull-weekly-report.mjs 2026-W22 --token <jwt>
 *   node scripts/pull-weekly-report.mjs 2026-W22 --token <jwt> --force
 *
 * 选项：
 *   --api-base <url>  后端地址，默认读 .env.local 的 VITE_API_URL，再回退 http://localhost:3001
 *   --token <jwt>     admin 用户的 JWT（登录后从 localStorage fitness_auth_token 取）
 *   --force           目标文件已存在时覆盖（默认拒绝）
 *   --dry-run         不写文件，只打印内容到 stdout
 */

import { parseArgs } from 'node:util'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const { values: args, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'api-base': { type: 'string' },
    token: { type: 'string' },
    force: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
  strict: false,
})

if (args.help || positionals.length === 0) {
  console.log(`
Usage:
  node scripts/pull-weekly-report.mjs <week> --token <jwt> [options]

Arguments:
  <week>          ISO week id, e.g. 2026-W22

Options:
  --api-base <url>  API base URL (default: reads .env.local VITE_API_URL or http://localhost:3001)
  --token <jwt>     Admin JWT token (required)
  --force           Overwrite existing file
  --dry-run         Print to stdout, do not write file
  -h, --help        Show this help
`)
  process.exit(positionals.length === 0 ? 1 : 0)
}

const week = positionals[0]
if (!/^\d{4}-W\d{2}$/.test(week)) {
  console.error(`Error: invalid week format "${week}", expected YYYY-Www (e.g. 2026-W22)`)
  process.exit(1)
}

// ─── Resolve API base ──────────────────────────────────────────────
function resolveApiBase() {
  if (args['api-base']) return args['api-base'].replace(/\/+$/, '')
  // Try reading .env.local
  const envPath = path.join(ROOT, '.env.local')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8')
    const m = content.match(/^VITE_API_URL\s*=\s*(.+)$/m)
    if (m) return m[1].trim().replace(/\/+$/, '')
  }
  return 'http://localhost:3001'
}

const apiBase = resolveApiBase()
const token = args.token

if (!token) {
  console.error('Error: --token <jwt> is required.')
  console.error('  Get your token: open DevTools → Application → localStorage → fitness_auth_token')
  process.exit(1)
}

// ─── Fetch weekly report ───────────────────────────────────────────
console.error(`Fetching ${apiBase}/telemetry/weekly-reports/${week} ...`)

let report
try {
  const res = await fetch(`${apiBase}/telemetry/weekly-reports/${week}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) {
    console.error(`Report not found. Generate it first:`)
    console.error(
      `  curl -X POST -H 'Authorization: Bearer ${token}' ${apiBase}/telemetry/weekly-reports/${week}/regenerate`,
    )
    process.exit(1)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error(`API error ${res.status}: ${body.error ?? res.statusText}`)
    process.exit(1)
  }
  report = await res.json()
} catch (err) {
  console.error(`Network error: ${err.message}`)
  process.exit(1)
}

const reportMd = report.report_md
if (!reportMd) {
  console.error('Report found but report_md is empty.')
  process.exit(1)
}

if (args['dry-run']) {
  console.log(reportMd)
  console.error(`\n✔ dry-run: printed ${week} to stdout (not written to disk)`)
  process.exit(0)
}

// ─── Write file ────────────────────────────────────────────────────
const outDir = path.join(ROOT, 'docs', 'reports', 'weekly')
const outFile = path.join(outDir, `${week}.md`)

if (existsSync(outFile) && !args.force) {
  console.error(`File already exists: ${outFile}`)
  console.error('Use --force to overwrite.')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, reportMd, 'utf8')

console.error(`\n✔ Written: ${path.relative(ROOT, outFile)}`)
console.error(`  status: ${report.status}, generated_by: ${report.generated_by}`)
console.error(`  Next: git add ${path.relative(ROOT, outFile)} && git commit -m "docs: add weekly report ${week}"`)
