#!/usr/bin/env bash
# 从 SVG 生成 Android / iOS 可用的 PNG 图标（小米、华为桌面图标依赖 PNG）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/public/icons"
npx --yes @resvg/resvg-js-cli --fit-width 192 --fit-height 192 icon-192.svg icon-192.png
npx --yes @resvg/resvg-js-cli --fit-width 512 --fit-height 512 icon-512.svg icon-512.png
npx --yes @resvg/resvg-js-cli --fit-width 512 --fit-height 512 icon-maskable.svg icon-512-maskable.png
echo "✅ 已生成 icon-192.png、icon-512.png、icon-512-maskable.png"
