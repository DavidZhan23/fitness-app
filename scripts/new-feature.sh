#!/usr/bin/env bash
# Start a feature branch and milestone doc skeleton.
# Usage: bash scripts/new-feature.sh <slug>
# Example: bash scripts/new-feature.sh csv-export

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
**Started:** ${TODAY}

## Goal

<!-- What problem does this solve? -->

## Success criteria

- [ ] 

## Non-goals

- 

## Inputs / outputs

| Input | Output |
|-------|--------|
| | |

## Edge cases

- 

## Files / modules

- 

## Risks

| Risk | Mitigation |
|------|------------|
| | |
EOF
  echo "Created $MILESTONE"
else
  echo "Milestone doc already exists: $MILESTONE"
fi

echo ""
echo "Next: clarify requirements (Cursor planning rules), implement, then:"
echo "  bash scripts/ai-flow.sh --message \"feat(${SLUG}): ...\""
