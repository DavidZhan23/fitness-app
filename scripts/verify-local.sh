#!/usr/bin/env bash
# Local quality gate before pushing main.
# Usage:
#   bash scripts/verify-local.sh
#   bash scripts/verify-local.sh --skip-e2e

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_E2E=false

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-e2e) SKIP_E2E=true; shift ;;
    -h|--help)
      echo "Usage: bash scripts/verify-local.sh [--skip-e2e]"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

FAILURES=0

run_step() {
  local label="$1"
  shift
  echo ""
  echo "==> ${label}"
  if "$@"; then
    echo "✔ ${label}"
  else
    echo "✘ ${label}"
    FAILURES=$((FAILURES + 1))
  fi
}

guard_no_raw_fetch() {
  local matches
  matches="$(rg --files-with-matches "\\bfetch\\(" src 2>/dev/null || true)"
  if [ -z "$matches" ]; then
    return 0
  fi

  local violations
  violations="$(printf '%s\n' "$matches" | rg -v "^(src/lib/api/http.ts|src/lib/telemetry.ts)$" || true)"
  if [ -n "$violations" ]; then
    echo "Raw fetch found outside whitelist:"
    printf '%s\n' "$violations"
    return 1
  fi
  return 0
}

guard_storage_scope() {
  local matches
  matches="$(rg --files-with-matches "localStorage|sessionStorage" src 2>/dev/null || true)"
  if [ -z "$matches" ]; then
    return 0
  fi

  local violations
  violations="$(printf '%s\n' "$matches" | rg -v "^(src/lib/api/http.ts|src/lib/communityListCache.ts|src/lib/telemetry.ts)$" || true)"
  if [ -n "$violations" ]; then
    echo "Storage API usage found outside whitelist:"
    printf '%s\n' "$violations"
    return 1
  fi
  return 0
}

guard_api_contract_sync() {
  local range="HEAD"
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    range="origin/main...HEAD"
  fi

  local changed
  changed="$(git diff --name-only "$range" -- . 2>/dev/null || true)"
  if [ -z "$changed" ]; then
    return 0
  fi

  local route_changed
  route_changed="$(printf '%s\n' "$changed" | rg "^server/src/routes/.+\\.js$" || true)"
  if [ -z "$route_changed" ]; then
    return 0
  fi

  local contract_changed
  contract_changed="$(printf '%s\n' "$changed" | rg "^docs/architecture/api-contract\\.md$" || true)"
  if [ -n "$contract_changed" ]; then
    return 0
  fi

  echo "Route files changed but api-contract not updated."
  echo "Changed routes:"
  printf '%s\n' "$route_changed"
  echo "Please update docs/architecture/api-contract.md."
  return 1
}

run_step "lint" npm run lint
run_step "typecheck" npm run typecheck
run_step "unit tests" npm run test

if [ "$SKIP_E2E" = true ]; then
  echo ""
  echo "==> e2e tests"
  echo "⚠ skipped by --skip-e2e"
else
  run_step "e2e tests" npm run test:e2e
fi

run_step "server syntax (entry)" node --check server/src/index.js
run_step "server syntax (modules)" bash -lc 'for f in server/src/*.js; do node --check "$f"; done'

run_step "guard: raw fetch scope" guard_no_raw_fetch
run_step "guard: storage scope" guard_storage_scope
run_step "guard: api contract sync" guard_api_contract_sync

echo ""
node scripts/check-milestone-status.mjs || true

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "verify-local failed: ${FAILURES} step(s) failed."
  exit 1
fi

echo "verify-local passed."
