#!/usr/bin/env bash
# Commit, push feature branch, open draft PR, show CI links.
# Requires: collaborator push access, gh CLI authenticated.
# Usage:
#   bash scripts/ai-flow.sh --message "feat(scope): description"
#   bash scripts/ai-flow.sh   # prompts for message

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OWNER_REVIEWER="DavidZhan23"
REPO="DavidZhan23/fitness-app"

MESSAGE=""
SKIP_PR=false
SKIP_WATCH=false

while [ $# -gt 0 ]; do
  case "$1" in
    --message|-m) MESSAGE="$2"; shift 2 ;;
    --skip-pr) SKIP_PR=true; shift ;;
    --skip-watch) SKIP_WATCH=true; shift ;;
    -h|--help)
      echo "Usage: bash scripts/ai-flow.sh --message \"feat(x): ...\""
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

command -v git >/dev/null || { echo "git required"; exit 1; }
command -v gh >/dev/null || { echo "gh CLI required: brew install gh && gh auth login"; exit 1; }

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "❌ On $BRANCH. Create a feature branch first:"
  echo "   bash scripts/new-feature.sh <slug>"
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "❌ No staged or unstaged changes. Nothing to commit."
  exit 1
fi

# Stage all tracked changes (respect .gitignore)
git add -A

if [ -z "$MESSAGE" ]; then
  echo "Enter Conventional Commit message (e.g. feat(export): add CSV download):"
  read -r MESSAGE
fi

if [ -z "$MESSAGE" ]; then
  echo "❌ Commit message required."
  exit 1
fi

# --- Confirm summary ---
FILES="$(git diff --cached --name-only | wc -l | tr -d ' ')"
FILE_LIST="$(git diff --cached --name-only | head -20)"
STAT="$(git diff --cached --shortstat | tail -1)"
ADD="$(echo "$STAT" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo 0)"
DEL="$(echo "$STAT" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo 0)"

echo ""
echo "准备执行："
echo "- 分支：$BRANCH（当前 HEAD: $BRANCH）"
echo "- 改动文件：$FILES 个"
echo "$FILE_LIST" | sed 's/^/    /'
echo "- diff 摘要：+${ADD} / -${DEL} 行"
echo "- commit message：$MESSAGE"
echo "- push 目标：origin $BRANCH"
echo "- PR：draft，reviewer @$OWNER_REVIEWER"
echo ""
echo "回复 go 继续，或 Ctrl+C 取消："
read -r CONFIRM

case "$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]')" in
  go|ok|yes|y) ;;
  *)
    echo "已取消（未 commit / push）。"
    git reset HEAD >/dev/null 2>&1 || true
    exit 0
    ;;
esac

git commit -m "$MESSAGE"
echo "✔ committed"

git push -u origin HEAD
echo "✔ pushed origin/$BRANCH"

# --- PR ---
PR_URL=""
if [ "$SKIP_PR" = false ]; then
  if gh pr view --json url -q .url 2>/dev/null; then
    PR_URL="$(gh pr view --json url -q .url)"
    echo "✔ PR already exists: $PR_URL"
  else
    PR_URL="$(gh pr create --draft --fill --reviewer "$OWNER_REVIEWER" 2>&1)" || true
    if [ -n "$PR_URL" ]; then
      echo "✔ draft PR: $PR_URL"
    fi
  fi
fi

# --- Links ---
ACTIONS_URL="https://github.com/${REPO}/actions"
WORKFLOW_URL="https://github.com/${REPO}/actions/workflows/ci.yml"
RUN_URL=""

sleep 3
RUN_URL="$(gh run list --branch "$BRANCH" --limit 1 --json url -q '.[0].url' 2>/dev/null || true)"

echo ""
echo "──────── 查看 CI ────────"
[ -n "$PR_URL" ] && echo "PR:       $PR_URL"
echo "Actions:  $WORKFLOW_URL"
[ -n "$RUN_URL" ] && echo "Run:      $RUN_URL"
echo ""
echo "Cmd+Click 链接 → Cursor Simple Browser"
echo "或 Cmd+Shift+P → Simple Browser: Show"
echo ""

if [ "$SKIP_WATCH" = false ] && command -v gh >/dev/null; then
  RUN_ID="$(gh run list --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)"
  if [ -n "$RUN_ID" ]; then
    echo "按 Enter 启动 gh run watch（Ctrl+C 退出不影响 PR）..."
    read -r _
    gh run watch "$RUN_ID" --exit-status || true
  else
    echo "（CI run 尚未出现，稍后在 Actions 页刷新）"
  fi
fi

echo ""
echo "完成后：自查 PR → Mark ready for review → 等待 @$OWNER_REVIEWER merge"
