import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveAppVersion(): string {
  if (process.env.VITE_APP_VERSION) return process.env.VITE_APP_VERSION
  try {
    const pkg = JSON.parse(
      readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
    ) as { version?: string }
    return pkg.version ?? ''
  } catch {
    return ''
  }
}

function resolveCommitSha(): string {
  if (process.env.VITE_COMMIT_SHA) return process.env.VITE_COMMIT_SHA
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

const APP_VERSION = resolveAppVersion()
const COMMIT_SHA = resolveCommitSha()
const ICON_QUERY = APP_VERSION ? `?v=${APP_VERSION}` : ''

function iconSrc(path: string) {
  return `${path}${ICON_QUERY}`
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(COMMIT_SHA),
  },
  plugins: [
    {
      name: 'inject-icon-version',
      transformIndexHtml(html) {
        return html.replaceAll('__ICON_VERSION__', APP_VERSION)
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon-32.png',
        'favicon.svg',
        'icons/*.png',
      ],
      manifest: {
        id: '/',
        name: '满打满算',
        short_name: '满打满算',
        description: '记录运动与饮食，追踪热量缺口',
        lang: 'zh-CN',
        dir: 'ltr',
        theme_color: '#0f766e',
        background_color: '#1e293b',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        prefer_related_applications: false,
        icons: [
          {
            src: iconSrc('/icons/icon-192.png'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: iconSrc('/icons/icon-512.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: iconSrc('/icons/icon-512-maskable.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
      },
    }),
  ],
})
