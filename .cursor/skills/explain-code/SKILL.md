---
name: explain-code
description: >-
  Explains how relevant modules and data flows work by tracing call chains from
  entry points, preferring the project reuse table, and outputting a short path
  diagram plus key files. Use when the user asks to explain code, read and
  understand a module, says 讲解 / 读懂 / 这段怎么工作 / how does this work, or
  before implementing a change that needs local architecture context.
---

# Explain Code

Help the user understand existing code before (or instead of) writing new code.

## Hard rules

1. **Start from an entry point** the user cares about (route, page, API handler, button handler). Trace the call chain downward; do not dump whole files.
2. **Prefer modules in the reuse table** (`.cursor/rules/06-reuse-first.mdc`). Name the canonical file for calories, dates, deficit, API client, etc.
3. **Output a short path diagram + key files** (3–8 bullets). Keep prose tight.
4. **No unrelated refactor proposals.** Explain what exists; only mention a change if the user asked how to change it, or a clear bug blocks understanding.
5. Do not edit production code unless the user explicitly asks after the explanation.

## Workflow

1. Confirm scope: which screen / feature / question (one sentence).
2. Locate entry: `src/pages/`, `src/App.tsx` routes, or `server/src/index.js` / feature module.
3. Trace: UI → hooks/lib → `apiFetch` / `httpData` → server route → DB (as far as needed).
4. Cross-check duplicates against the reuse table; call out if logic already lives elsewhere.
5. Deliver the explanation in the output format below.
6. Offer optional next steps: grill-me (if decisions still open) or implement (if already decided).

## Output format

```text
## 这段在干什么
<1–3 sentences>

## 调用路径
入口 → … → 关键计算/持久化

## 关键文件
- path — why it matters
- …

## 复用注意
- hit / miss from reuse table (if relevant)

## 你接下来可以
- grill 未决决策 / 开始实现 / 再追问某支路
```

Use a tiny mermaid `flowchart LR` only when the chain has ≥ 4 hops or forks; otherwise a one-line arrow path is enough.

## Fitness-app shortcuts

| Concern | Look here first |
|---------|-----------------|
| BMR / TDEE / deficit colors | `src/lib/calories.ts`, `server/src/calories.js` |
| Minute metabolism / spread deficit | `src/lib/metabolism.ts`, `server/src/metabolism.js` |
| Date keys | `src/lib/streaks.ts`, `server/src/dateKey.js` |
| HTTP + JWT | `src/lib/api/http.ts`, `src/lib/api/index.ts` |
| Day log mutations | `src/lib/dayLogService.ts`, `server/src/dayLogMutation.js` |
| Community / social | `server/src/community.js`, `server/src/social.js` |

## Related

- After understanding + fuzzy plan → `.cursor/skills/grill-me/SKILL.md`
- After build + UI change → `.cursor/skills/persona-ui-test/SKILL.md`
