#!/usr/bin/env node
/**
 * Local WCAG contrast check for theme readable tokens.
 * Usage: node scripts/check-theme-contrast.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const themesDir = join(__dirname, '../src/styles/themes')

const THEME_FILES = readdirSync(themesDir).filter(
  (f) => f.endsWith('.css') && f !== 'index.css',
)

function parseHex(hex) {
  const h = hex.replace('#', '').slice(0, 6)
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return [lin(r), lin(g), lin(b)]
}

function luminance(hex) {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(fg, bg) {
  const L1 = luminance(fg)
  const L2 = luminance(bg)
  const hi = Math.max(L1, L2)
  const lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}

function tokenValue(css, name, depth = 0) {
  if (depth > 8) return null
  const re = new RegExp(`--${name}:\\s*([^;]+);`)
  const m = css.match(re)
  if (!m) return null
  let v = m[1].trim()
  if (v.startsWith('var(')) {
    const inner = v.match(/var\(--([^)]+)\)/)?.[1]
    if (inner) return tokenValue(css, inner, depth + 1)
  }
  const hex = v.match(/#[0-9a-f]{3,8}/i)?.[0]
  return hex ?? null
}

function checkPair(label, fg, bg) {
  if (!fg || !bg) {
    console.log(`  ${label}: SKIP (non-hex token)`)
    return 0
  }
  const r = contrastRatio(fg, bg)
  const ok = r >= 4.5
  if (!ok) {
    console.log(`  ${label}: ${r.toFixed(2)} FAIL (${fg} on ${bg})`)
    return 1
  }
  console.log(`  ${label}: ${r.toFixed(2)} OK (${fg} on ${bg})`)
  return 0
}

let failed = 0

for (const file of THEME_FILES) {
  const slug = file.replace('.css', '')
  const styleKey = slug === 'default' ? ':root' : `[data-style='${slug}']`
  const css = readFileSync(join(themesDir, file), 'utf8')
  const card = tokenValue(css, 'surface-card')
  const page = tokenValue(css, 'surface-page')
  const panel = tokenValue(css, 'surface-panel-bg') ?? card
  const menuText = tokenValue(css, 'settings-menu-text')
  const signOutText = tokenValue(css, 'btn-sign-out-text')
  const signOutBg = tokenValue(css, 'btn-sign-out-bg')

  console.log(`\n${styleKey}`)

  failed += checkPair('settings-menu/card', menuText, card)
  failed += checkPair('settings-menu/panel', menuText, panel)
  failed += checkPair('sign-out', signOutText, signOutBg)

  const isLight = ['lavender', 'sakura', 'sakura-blush', 'active-mint', 'soy-tea'].includes(
    slug,
  )
  if (isLight) {
    for (const [label, token] of [
      ['primary', 'text-primary'],
      ['muted', 'text-muted'],
      ['link', 'text-link'],
    ]) {
      const fg =
        tokenValue(css, token) ??
        (token === 'text-link' ? tokenValue(css, 'color-brand-dark') : null)
      if (!fg) continue
      failed += checkPair(`${label}/card`, fg, card)
      failed += checkPair(`${label}/page`, fg, page)
    }
    const bmrText = tokenValue(css, 'bmr-formula-text')
    const bmrBg = tokenValue(css, 'bmr-formula-panel-bg')
    failed += checkPair('bmr', bmrText, bmrBg)
  }
}

console.log(failed ? `\n${failed} pair(s) below 4.5:1` : '\nAll checked pairs ≥ 4.5:1')
process.exit(failed ? 1 : 0)
