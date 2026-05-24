#!/usr/bin/env bash
# Start a feature branch and milestone doc skeleton.
# Usage: bash scripts/new-feature.sh <slug>
# Example: bash scripts/new-feature.sh csv-export
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

BRANCH="feat/${SLUG}"
MILESTONE="docs/milestones/${SLUG}.md"

if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Branch $BRANCH already exists."
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
  echo "Created and checked out $BRANCH"
fi

if [ ! -f "$MILESTONE" ]; then
  mkdir -p docs/milestones
  TODAY="$(date +%Y-%m-%d)"
  cat > "$MILESTONE" <<EOF
# Milestone: ${SLUG}

**Status:** active
**Branch:** \`${BRANCH}\`
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
echo "Next: clarify in Cursor (docs/ai-playbook.md), implement, then:"
echo "  bash scripts/ai-flow.sh --message \"feat(${SLUG}): ...\""
