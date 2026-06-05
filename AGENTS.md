# AGENTS.md

This file summarizes `.cursor/rules/*.mdc` for Codex and other coding agents.
Follow it together with higher-priority system/developer instructions.

## 1. Project Context

- Product: fitness check-in / calorie tracking PWA for a small family group. It records exercise and food, calculates BMR/TDEE and daily calorie deficit, and shows calendar walls plus community activity.
- Frontend: Vite 8, React 19, TypeScript, Tailwind 4, vite-plugin-pwa in `src/`.
- Backend: Node.js Express ESM in `server/src/`.
- Database: PostgreSQL 16 locally, Docker in production under `deploy/`.
- Manual deploy: `scripts/deploy-tencent.sh`.
- Key docs:
  - `docs/README.md` doc hub.
  - `docs/GETTING-START.md` local setup.
  - `docs/ai-playbook.md` agent checklist.
  - `docs/milestones/` feature specs.
  - `docs/ops/` DB, deploy, PWA, QA guides.
  - `docs/architecture/` overview, API contract, deploy.
- Local dev:
  - DB: `brew services start postgresql@16`, database `fitness`.
  - API: `cd server && npm run dev` on port 3001.
  - Web: `npm run dev` on port 5173.

## 2. Requirement Intake

Start each non-trivial task with a one-line triage that the user may override:

- `直接修复`: clear bug/change, no API/schema/key interaction changes, and small scope.
- `需澄清`: fuzzy requirement, larger impact, API/data/key interaction change, or multiple reasonable designs.
- `先看一下再说`: inspect first when impact is unclear.

For new features or fuzzy requirements, clarify before coding. Cover:

- target user and usage trigger;
- testable success criteria;
- non-goals and boundaries;
- inputs, outputs, fields, and units;
- empty/error/offline/cross-day/cross-user edge cases;
- DB/API/privacy/performance impact.

For non-trivial work, create or update `docs/milestones/<slug>.md` using `docs/milestones/_TEMPLATE.md`, index it in `docs/milestones/README.md`, and include:

- acceptance criteria and non-goals;
- likely touched modules;
- risks and rollback;
- read-doc checklist;
- reusable-module check from the reuse table.

If requirements change mid-work, update the milestone before continuing implementation.

## 3. Coding Rules

- Read the active milestone before editing when one exists.
- Match existing patterns in `src/` and `server/src/`: naming, imports, errors, data flow, and component style.
- Keep scope tight. Do not refactor unrelated code.
- Before adding a new file in `src/lib/`, `src/hooks/`, `src/context/`, `server/src/`, or `scripts/`, search existing reusable modules and extend/import them when possible.
- Do not duplicate core logic:
  - BMR/TDEE/calorie formulae: `src/lib/calories.ts`, `server/src/calories.js`.
  - minute-level metabolism and deficit: `src/lib/metabolism.ts`, `server/src/metabolism.js`.
  - date keys: `src/lib/streaks.ts`, `src/lib/monthCalendar.ts`, `server/src/dateKey.js`.
  - `toKcal`.
- Do not read `localStorage` or `sessionStorage` outside approved modules: `src/lib/api/http.ts`, `src/lib/communityListCache.ts`, `src/lib/telemetry.ts`.
- Do not write raw `fetch()` calls for app API work; use `apiFetch` through `src/lib/api/http.ts` / `src/lib/api/index.ts`.
- Use `src/lib/profileDisplay.ts` and `server/src/publicProfile.js` for display names/public nicknames. Do not create parallel nickname helpers.
- Schema changes must add a new numbered SQL file under `server/migrations/`; do not edit old migrations. Also add the same idempotent DDL to `server/src/db.js#runMigrations()` until migration sources are unified.
- API changes require updating `docs/architecture/api-contract.md`.
- User-visible feature or behavior changes should update root `README.md` where appropriate.
- Significant technical decisions should add a short ADR from `docs/decisions/_template.md`.

## 4. UI Discussion Protocol

For important UI, layout, interaction, theme, or responsive changes, discuss before editing production files.

Use this workflow:

1. Restate the user goal and the current UI problem.
2. Offer 2-3 concrete options, with a recommended default.
3. Explain tradeoffs for mobile, desktop, theme compatibility, information hierarchy, interaction entry points, and verification.
4. Wait for confirmation before implementation.

Small UI changes may be implemented directly when they are clearly scoped:

- typo or small copy change;
- single button/label adjustment;
- already-confirmed visual tweak;
- obvious layout bug with one clear fix.

If screenshots and written instructions conflict, prefer the written instruction and call out the conflict before editing.

After UI changes, summarize what changed visually and what was verified. For responsive work, prefer focused Playwright checks such as:

- `npm run check:today-responsive`;
- `npm run check:mobile-layout`;
- `npm run check:site-responsive`.

## 5. Verification And QA

Before commit/push-ready handoff, run from repo root:

```bash
npm run verify
```

For docs-only changes, `bash scripts/verify-local.sh --skip-e2e` is acceptable.

For focused changes, run the smallest useful checks first, then broaden if risk demands it:

- `npm run typecheck`;
- `npm run build`;
- unit tests with `npm test`;
- focused e2e scripts for affected routes.

E2E requires local PostgreSQL at `postgres://localhost:5432/fitness`. Playwright starts API on 3101 and Vite on 4173. If sandboxing blocks DB/server access, explain that and request the required permission.

If the same problem fails twice, stop. Summarize what was tried, the current hypothesis, and a proposed split or fallback before a third attempt.

Community QA seed rules:

- `seed:qa-manual` and `cleanup:qa-seed` may only target local `localhost` / `127.0.0.1` database `fitness`.
- Do not auto-create `jerryuk1019@163.com`; seed warns and exits 0 if missing.
- Cleanup deletes only `qa-seed+%@example.com`, never the manual QA account.
- Automatic seed belongs only in `e2e/global-teardown.mjs`.
- Skip QA seed with `PW_SKIP_QA_SEED=1 npm run test:e2e`.

If work touches community, inbox, follow, comments, likes, or dislikes, report the manual QA checklist after e2e:

1. Log in locally as `jerryuk1019@163.com`.
2. Check Community -> Inbox.
3. Check followers.
4. Open `qa-seed+fan-a` / `fan-b` user pages and `#day-comments`.
5. Confirm data has the expected QA seed prefix.

## 6. Git Workflow

- Do not commit or push without explicit user approval.
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Keep one user-facing change per commit.
- Before any commit/push, print this confirm gate and stop:

```text
准备执行：
- 当前分支：<branch>
- 改动文件：<list, N files>
- diff 摘要：+<additions> / -<deletions> 行
- commit message：<full conventional message>
- push 目标：origin <current-branch>
- PR 目标：main（创建或更新 PR）
- qa-seed 清理：npm run cleanup:qa-seed 已执行（若本轮跑过 e2e/seed）

回复 go 继续，或告诉我需要调整哪里。
```

After the user says `go` / `ok` / `yes`:

1. Commit on the current branch.
2. Push to `origin/<current-branch>`.
3. Create or update a PR to `main`.
4. Return the PR URL.

Before creating a new feature branch, sync latest `main` first:

```bash
bash scripts/new-feature.sh <slug>
```

Manual equivalent:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b feat/<slug>
```

Require a clean working tree before branching; stash or commit first. Do not branch from a stale feature branch unless the user explicitly asks.

If e2e/QA seed ran in this work session, run `npm run cleanup:qa-seed` successfully before commit/push.

After PR merge to `main`, remind the owner to run manual deploy with `npm run deploy:tencent` or `npm run deploy:tencent:api`.
