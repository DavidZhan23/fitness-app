#!/usr/bin/env bash
# One-time: create labels for requirement intake workflow.
# Usage: bash scripts/setup-req-labels.sh
# Requires: gh CLI with repo admin (or label create permission)

set -euo pipefail

create() {
  local name="$1"
  local color="$2"
  local description="$3"
  if gh label list --json name --jq ".[] | select(.name==\"$name\") | .name" | grep -qx "$name"; then
    echo "  exists: $name"
  else
    gh label create "$name" --color "$color" --description "$description"
    echo "  created: $name"
  fi
}

echo "Creating requirement labels..."
create "status:todo" "ededed" "待开发"
create "status:doing" "fbca04" "开发中（已关联 PR）"
create "priority:high" "d73a4a" "高优先级"
create "priority:med" "fbca04" "中优先级"
create "priority:low" "0e8a16" "低优先级"
echo "Done."
