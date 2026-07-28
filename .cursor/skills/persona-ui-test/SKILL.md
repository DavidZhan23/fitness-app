---
name: persona-ui-test
description: >-
  Probes the UI as a family persona via the browser MCP, walking main paths and
  edge cases, then reports pass / bugs / suggested Playwright e2e cases. Use when
  the user asks for persona testing, UI acceptance, edge probing, says 拟人测 /
  验收 UI / 探边界 / persona-ui-test, or after UI changes before crystallizing e2e.
---

# Persona UI Test

Agent plays a family user in the real UI (Browser first), then crystallizes stable paths into Playwright suggestions. Do **not** treat this as a substitute for `npm run verify`.

## Hard rules

1. Use **cursor-ide-browser** MCP (navigate → lock → snapshot → interact). Prefer refs from snapshots; refresh snapshot after UI changes.
2. Stay in **probe mode**: report defects; **do not** make large product fixes during the session unless the user explicitly asks to fix.
3. Cover **main path + edges** from the checklist below (skip only what is clearly out of scope for this change).
4. End with a structured report: **通过 / 缺陷 / 建议 e2e**.
5. Suggested e2e must be concrete (route, steps, assertion idea) suitable for later `e2e/*.spec.ts` — do not invent a CI persona pipeline.

## Personas (pick one primary; note secondary if useful)

| Id | Persona | Typical goals |
|----|---------|----------------|
| `self-today` | 自己 · 今日 | Open Today, read deficit, add/edit log, refresh |
| `self-history` | 自己 · 补记历史日 | Pick a past day, log meal/exercise, confirm totals |
| `family-viewer` | 家庭成员 · 看别人 | Community / user wall, read-only vs interact (like/comment) per permissions |
| `new-empty` | 新/空数据 | Empty day, empty community, first-run cues |

State which persona you are at the start of the session.

## Edge checklist

- [ ] **Main path** — happy path for the change under test
- [ ] **Empty** — no logs / no members / missing profile fields as relevant
- [ ] **Cross-day** — today vs yesterday / picked date; midnight boundary only if in scope
- [ ] **Permission** — own vs other user; logged-out redirect if reachable
- [ ] **Error / offline-ish** — validation message, failed save, or blocked action (simulate if easy; else note “not probed”)
- [ ] **Mobile width** — if layout-sensitive, resize or use a narrow viewport once

## Workflow

1. Confirm target URL/route, persona, and what changed (or milestone slug).
2. Ensure local app is reachable (dev server or user-provided URL). If not running, ask or start per `docs/GETTING-START.md` — do not assume production.
3. Browser: list tabs → navigate → lock → snapshot → act through checklist.
4. Log each step briefly (action → expected → actual).
5. Write findings into the active milestone **测试方案** (拟人探查结论 / 拟沉淀 e2e) when a milestone exists.
6. Hand off: user may ask to fix bugs, or to implement suggested e2e next.

## Output format

```text
## 拟人探查
- 人设：…
- 范围：…
- 环境：URL / viewport

## 通过
- …

## 缺陷
- [P0/P1/P2] …（复现步骤 → 期望 → 实际）

## 建议 e2e
- `e2e/<name>.spec.ts`：步骤摘要 → 关键断言
- …

## 未探
- …（原因）
```

## Related

- Loop position: after implement, before / alongside crystallizing Playwright, then `npm run verify`, then closed-loop commit (`03-commit-and-push.mdc`).
- Playbook: `docs/ai-playbook.md`
- Manual community QA seed (if social surfaces): `.cursor/rules/05-qa-manual-seed.mdc`
