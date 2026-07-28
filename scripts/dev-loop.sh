#!/usr/bin/env bash
# Print the in-repo development closed-loop entry points (no heavy tooling).
# Usage: bash scripts/dev-loop.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cat <<EOF
开发闭环（fitness-app）

  提需求 → /grill-me → 确认 shared understanding
       → 实现（按需 /explain-code）
       → UI：/persona-ui-test
       → npm run verify
       → commit/push on \${DEV_BRANCH:-dev/huanghongli} → PR → main

Skills（项目内，可发现）
  $ROOT/.cursor/skills/grill-me/SKILL.md
  $ROOT/.cursor/skills/explain-code/SKILL.md
  $ROOT/.cursor/skills/persona-ui-test/SKILL.md

触发词
  grill / 压需求 / 审方案
  讲解 / 读懂 / 这段怎么工作
  拟人测 / 探边界 / persona-ui-test

文档
  $ROOT/docs/ai-playbook.md
  $ROOT/docs/README.md  （「开发闭环 / skills」）
  $ROOT/AGENTS.md §7

同步个人分支 + milestone 骨架
  bash scripts/new-feature.sh <slug>
EOF
