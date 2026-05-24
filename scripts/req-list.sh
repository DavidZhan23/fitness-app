#!/usr/bin/env bash
# List open requirements (issues) for the current GitHub user.
# Usage:
#   bash scripts/req-list.sh        # my status:todo issues
#   bash scripts/req-list.sh --all   # all my open issues
#
# Requires: gh CLI (gh auth login)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALL_OPEN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --all) ALL_OPEN=true; shift ;;
    -h|--help)
      echo "Usage: bash scripts/req-list.sh [--all]"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

command -v gh >/dev/null || {
  echo "gh CLI required: brew install gh && gh auth login"
  exit 1
}

if [ "$ALL_OPEN" = true ]; then
  gh issue list --author @me --state open --limit 30 \
    --json number,title,labels,url \
    --jq '.[] | "#\(.number) \(.title)\n  \(.url)\n  labels: \([.labels[].name] | join(", "))\n"'
else
  gh issue list --author @me --state open --label "status:todo" --limit 30 \
    --json number,title,labels,url \
    --jq '.[] | "#\(.number) \(.title)\n  \(.url)\n  labels: \([.labels[].name] | join(", "))\n"'
fi

echo "Tip: 在 Cursor 里说「开始 #<number>」进入澄清与开发。"
