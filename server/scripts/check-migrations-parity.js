#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, readFile } from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DB_JS_PATH = path.resolve(ROOT, 'src/db.js')
const MIGRATIONS_DIR = path.resolve(ROOT, 'migrations')

function normalizeSql(sql) {
  return sql
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*$/g, '')
    .trim()
}

function fingerprint(sql) {
  return normalizeSql(sql)
    .replace(/\bif not exists\b/g, '')
    .replace(/\bon conflict do nothing\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSqlStatements(rawSql) {
  return rawSql
    .split(';')
    .map((part) => normalizeSql(part))
    .filter((stmt) =>
      /^(create table|alter table|create index|create extension)\b/.test(stmt),
    )
}

function extractInlineSqlFromDb(dbSource) {
  const runMigrationsMatch = dbSource.match(
    /export async function runMigrations\(\) \{([\s\S]*?)\n\}/,
  )
  if (!runMigrationsMatch) return []
  const runMigrationsBody = runMigrationsMatch[1]

  const templateSqlMatches = [
    ...runMigrationsBody.matchAll(
      /await pool\.query\(\s*`([\s\S]*?)`\s*,?\s*\)/g,
    ),
  ].map((match) => match[1])

  const statements = []
  for (const sqlChunk of templateSqlMatches) {
    statements.push(...parseSqlStatements(sqlChunk))
  }
  return statements
}

async function loadMigrationStatements() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((name) => /^\d+.*\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

  const statements = []
  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    const parsed = parseSqlStatements(sql)
    statements.push(...parsed.map((stmt) => `${file} :: ${stmt}`))
  }
  return statements
}

function printDiffReport(title, list) {
  if (list.length === 0) {
    console.log(`- ${title}: none`)
    return
  }
  console.log(`- ${title}: ${list.length}`)
  for (const item of list.slice(0, 20)) {
    console.log(`  - ${item}`)
  }
  if (list.length > 20) {
    console.log(`  ... +${list.length - 20} more`)
  }
}

async function main() {
  const dbSource = await readFile(DB_JS_PATH, 'utf8')
  const inlineStatements = extractInlineSqlFromDb(dbSource)
  const migrationStatements = await loadMigrationStatements()

  const inlineFingerprints = new Set(inlineStatements.map(fingerprint))
  const migrationFingerprints = new Set(
    migrationStatements.map((stmt) => fingerprint(stmt.split(' :: ')[1] ?? '')),
  )

  const inlineOnly = inlineStatements.filter(
    (stmt) => !migrationFingerprints.has(fingerprint(stmt)),
  )
  const migrationOnly = migrationStatements.filter((entry) => {
    const sql = entry.split(' :: ')[1] ?? ''
    return !inlineFingerprints.has(fingerprint(sql))
  })

  console.log('Migration parity report')
  console.log(`- inline runMigrations statements: ${inlineStatements.length}`)
  console.log(`- migration file statements: ${migrationStatements.length}`)
  printDiffReport('inline-only statements', inlineOnly)
  printDiffReport('migration-only statements', migrationOnly)
  console.log(
    '- note: this report is observational and does not block startup/tests.',
  )
}

main().catch((err) => {
  console.error('Failed to generate migration parity report:', err)
  process.exit(0)
})
