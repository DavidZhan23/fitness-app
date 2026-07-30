---
name: grill-me
description: >-
  Interviews the user relentlessly about a plan or design until reaching shared
  understanding, one question at a time with a recommended answer, then writes
  decisions into the milestone. Use when the user wants to stress-test a plan,
  get grilled on a design, says grill / grill-me / 压需求 / 审方案 / 严苛澄清,
  or when fuzzy requirements need decision-tree clarification before coding.
---

# Grill Me

Adapt Matt Pocock's grill-me for this fitness-app repo: hard clarification before production code.

## Hard rules

1. **One question at a time.** Wait for the answer before the next question. Never dump a batch.
2. **Every question includes a recommended answer** so the user reacts (accept / tweak) instead of drafting from scratch.
3. **Explore the codebase first** when a question is answerable by reading the repo (reuse table, existing pages, API contract). Do not ask the user to be a lookup service.
4. **Write settled decisions** into the active `docs/milestones/<slug>.md` (Goal / Non-goals / Edge cases / Inputs-Outputs as appropriate). Create or update the milestone if missing.
5. **No production code** (`src/`, `server/src/`, `e2e/` product assertions) until you and the user have **shared understanding**. Docs/milestone updates during grilling are allowed.

## Workflow

1. Restate the plan or requirement in 2–3 sentences (what you think is being built).
2. Identify open branches of the decision tree (user/scope, success criteria, non-goals, data shape, edges, API/DB impact).
3. Resolve dependencies in order: answer from code when possible; otherwise ask one question + recommendation.
4. After each user answer, briefly record the decision and pick the next highest-dependency branch.
5. When branches are resolved, summarize shared understanding, update the milestone, and ask the user to confirm shared understanding (one short confirm). After they confirm, hand off to **closed-loop implement** (`02-coding.mdc` → persona if UI → `npm run verify` → auto-commit on `dev/huanghongli` per `03-commit-and-push.mdc`). Do not wait for a second "go" after that confirm.

## Question shape

```text
Q: <one concrete decision>
推荐：<your default, grounded in codebase or product norms>
（接受 / 改一点 / 另说）
```

## Stop conditions

- User says shared understanding is enough, or explicitly asks to start coding.
- Remaining items are implementation details that do not change Goal / Non-goals / acceptance.
- User overrides with `直接修` for a tiny scoped fix (then exit grill; follow triage short-circuit).

## Project hooks

- Fuzzy intake / `需澄清` triage: prefer this skill over a single ≤5-question round when decisions are still soft.
- After grilling: ensure milestone Section 5–6 (read docs + reuse check) are filled before coding.
- Related: `.cursor/rules/01-planning-clarify.mdc`, `docs/ai-playbook.md`, `.cursor/skills/explain-code/SKILL.md`.

## Additional resources

- Decision dimensions and anti-patterns: [reference.md](reference.md)
