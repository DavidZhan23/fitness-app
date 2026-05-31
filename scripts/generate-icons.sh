#!/usr/bin/env bash
# 从 icon-source.png 生成 Android / iOS 可用的 PNG 图标（小米、华为桌面图标依赖 PNG）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$ROOT/scripts/generate-icons.mjs"
