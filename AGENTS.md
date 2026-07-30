# AGENTS.md

Coding agents: follow `.cursor/rules/*.mdc` and [docs/ai-playbook.md](docs/ai-playbook.md). This file is a **short pointer**, not a second playbook.

## Product / stack

Family fitness check-in PWA: Vite/React (`src/`) → Express (`server/src/`) → PostgreSQL. Manual deploy: `npm run deploy:tencent`.

Local: Postgres `fitness` · API `:3001` · Web `:5173`.

Docs hub: [docs/README.md](docs/README.md)（必读 vs 按需）.

## Loop

```text
需求 → grill-me → shared understanding → 实现 → persona-ui-test(UI) → verify
  → commit/push on dev/huanghongli → PR → main
```

Details: [docs/ai-playbook.md](docs/ai-playbook.md) · `bash scripts/dev-loop.sh` · `.cursor/skills/`

Triage: `直接修复` | `需澄清`（prefer grill-me） | `先看一下再说`

## Hard coding constraints

- Reuse table: `.cursor/rules/06-reuse-first.mdc` (no duplicate BMR/TDEE/metabolism/`toKcal`/dateKey helpers). Formula long-term home: [ADR-0008](docs/decisions/0008-shared-calories-package.md) (`packages/calories`); until migrated, keep FE/BE in sync.
- No raw `fetch` for app API — `apiFetch` / `src/lib/api/`.
- No `localStorage`/`sessionStorage` outside approved modules.
- Schema: new `server/migrations/NNN_*.sql` (+ `db.js#runMigrations` until unified).
- API change → update `docs/architecture/api-contract.md`. User-visible → root `README.md`「功能」when needed.

## Git

- Branch: **`dev/huanghongli`** → PR **`main`**. No per-feature `feat/<slug>` unless asked.
- Sync + milestone: `bash scripts/new-feature.sh <slug>`.
- **Closed-loop** (after grill confirm): may commit/push/PR without `go`.
- **Adhoc**: confirm gate, wait for `go`.
- After merge: remind manual deploy. QA seed: see `.cursor/rules/05-qa-manual-seed.mdc`.

## Verify

`npm run verify` (docs-only: `bash scripts/verify-local.sh --skip-e2e`). Stuck twice → stop and replan.
