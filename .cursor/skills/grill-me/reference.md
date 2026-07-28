# Grilling reference (fitness-app)

Lightweight decision checklist used by `grill-me`. Read only when the interview needs more structure.

## Decision dimensions (walk in dependency order)

1. **Who / when** — family member, self, community viewer; how often.
2. **Done looks like** — testable success criteria (not vibes).
3. **Non-goals** — what we will not build this round.
4. **Surface** — which screen / route / API; mobile-first assumptions.
5. **Data** — fields, units (kcal, date keys), create vs edit.
6. **Edges** — empty, offline, cross-day, cross-user, auth/permission, errors.
7. **Contract impact** — new/changed API, schema, privacy, performance.
8. **Verify path** — unit / persona-ui-test / e2e / docs-only.

## Prefer code over questions

Before asking, check:

- `.cursor/rules/06-reuse-first.mdc` reuse table
- `docs/architecture/api-contract.md` (if API-shaped)
- Existing page under `src/pages/` or feature under `src/features/`
- Active milestone under `docs/milestones/`

## Anti-patterns

- Asking five clarifying questions in one message (violates one-at-a-time).
- Asking “what do you want?” with no recommended answer.
- Asking about conventions already fixed by project rules (date keys, BMR location, no raw fetch).
- Starting `src/` / `server/` edits mid-grill “just to prototype” without user ask.
- Treating “直接修复” tiny bugs as full grill sessions.

## Exit → milestone

Minimum write-back after shared understanding:

- Goal + success criteria checkboxes
- Non-goals
- Edge cases that were decided
- Any API/schema impact noted for Section 9 / 13
