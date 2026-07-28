#!/usr/bin/env bash
# Sync personal long-lived branch with main and scaffold a milestone doc.
# Usage: bash scripts/new-feature.sh <slug>
# Example: bash scripts/new-feature.sh csv-export
# Does NOT create feat/<slug> — work stays on DEV_BRANCH (default: dev/huanghongli).
# Template: docs/milestones/_TEMPLATE.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "Usage: bash scripts/new-feature.sh <slug>"
  echo "Example: bash scripts/new-feature.sh csv-export"
  exit 1
fi

DEV_BRANCH="${DEV_BRANCH:-dev/huanghongli}"
MILESTONE="docs/milestones/${SLUG}.md"

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "Error: working tree has uncommitted changes. Commit or stash before syncing."
  exit 1
fi

echo "Syncing latest main from origin..."
git fetch origin
if ! git show-ref --verify --quiet refs/heads/main; then
  git checkout -b main origin/main
else
  git checkout main
fi
git pull --ff-only origin main

if git rev-parse --verify "$DEV_BRANCH" >/dev/null 2>&1; then
  git checkout "$DEV_BRANCH"
  echo "Updating $DEV_BRANCH with latest main..."
  if git merge --ff-only main; then
    echo "Fast-forwarded $DEV_BRANCH to main."
  else
    echo "Cannot fast-forward. Merging main into $DEV_BRANCH..."
    git merge main -m "chore: merge main into ${DEV_BRANCH}"
  fi
else
  git checkout -b "$DEV_BRANCH"
  echo "Created and checked out $DEV_BRANCH (from up-to-date main)"
fi

if [ ! -f "$MILESTONE" ]; then
  mkdir -p docs/milestones
  TODAY="$(date +%Y-%m-%d)"
  cat > "$MILESTONE" <<EOF
# Milestone: ${SLUG}

**Status:** active
**Branch:** \`${DEV_BRANCH}\`
**Issue:** #（可选）
**Started:** ${TODAY}

## 1. 任务背景

<!-- 触发这次工作的 issue / 反馈 / 痛点。一段话。 -->

## 2. 目标 (Goal)

<!-- 这次 done 长什么样。1-2 句。 -->

## 3. 成功标准 (Success criteria)

- [ ]

## 4. Non-goals

-

## 5. 已阅读的相关文档（必填）

- [ ] 本 milestone 文档
- [ ] \`docs/architecture/api-contract.md\`（若动 API）
- [ ] \`docs/architecture/overview.md\` ER 节（若动表）
- [ ] 其它：

## 6. 已检查的可复用代码（必填）

> 见 \`.cursor/rules/06-reuse-first.mdc\` 清单，命中就复用。

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| | | |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| | |

## 8. Edge cases

-

## 9. 涉及文件 / 模块（预期）

- \`src/...\`
- \`server/...\`

## 10. 实现步骤

**MVP（本次必交）：**

1.

**后续（不做）：**

-

## 11. 测试方案

- Smoke：\`npm run lint && npm run typecheck\`；server 改动则 \`node --check server/src/index.js\`
- **拟人探查结论**（\`persona-ui-test\`）：
- **拟沉淀 e2e**：

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| | |

## 13. 文档同步计划

- [ ] \`docs/architecture/api-contract.md\`（若动 API）
- [ ] 根 \`README.md\`「功能」一节（若用户可见的新功能或行为变更）
- [ ] 本 milestone Status 改 \`done\` + \`docs/milestones/README.md\` 更新

## 14. 回滚方案

- 代码：revert PR；DB：是否需要 down migration？

## 15. 是否满足最小可运行闭环

是 / 否——
EOF
  echo "Created $MILESTONE (see docs/milestones/_TEMPLATE.md for full 15-section structure)"
else
  echo "Milestone doc already exists: $MILESTONE"
fi

echo ""
echo "On branch: $DEV_BRANCH"
echo "Next: /grill-me → implement → /persona-ui-test (UI) → npm run verify → closed-loop commit"
echo "See docs/ai-playbook.md"
