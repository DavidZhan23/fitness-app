# AI 协作手册（开发闭环）

给 Cursor Agent 与开发者的**短清单**。细则在 `.cursor/rules/` 与 `.cursor/skills/`。

## 闭环（默认）

```text
提需求
  → /grill-me（一次一问 + 推荐答案；决策写入 milestone）
  → 用户确认 shared understanding
  → 实现（按需 /explain-code）+ 必要文档
  → UI 变更：/persona-ui-test（Browser 拟人；默认可记缺陷不大改）
  → npm run verify（docs-only 可 --skip-e2e）
  → 自动 commit + push：dev/huanghongli → PR → main
  → 打印 PR URL；合并后提醒手动部署
```

触发：`/grill-me` · `/explain-code` · `/persona-ui-test`，或口语「grill / 压需求」「讲解」「拟人测」。也可 `bash scripts/dev-loop.sh` 看路径。

## Skills

| Skill | 路径 | 作用 |
|-------|------|------|
| grill-me | [`.cursor/skills/grill-me/`](../.cursor/skills/grill-me/SKILL.md) | 严苛澄清；未确认不写生产代码 |
| explain-code | [`.cursor/skills/explain-code/`](../.cursor/skills/explain-code/SKILL.md) | 短调用链讲解 |
| persona-ui-test | [`.cursor/skills/persona-ui-test/`](../.cursor/skills/persona-ui-test/SKILL.md) | 拟人探边 → 通过/缺陷/建议 e2e |

## 分支

- 日常：`dev/huanghongli`（`DEV_BRANCH` 可覆盖）
- 同步 + milestone：`bash scripts/new-feature.sh <slug>`（**不开**每功能 `feat/<slug>`，除非用户要求）
- PR 目标：`main`

## Commit 两种模式

| 模式 | 何时 | 行为 |
|------|------|------|
| Closed-loop | grill 已确认 shared understanding | 可自动 commit/push/PR，事后摘要 + PR URL |
| Adhoc | 其它「帮我提交」等 | 打印确认块，等 `go` |

## 读文档顺序（按需）

1. Issue（`gh issue view N`）或用户原话  
2. `docs/milestones/<slug>.md`  
3. 动 API → `architecture/api-contract.md`（先看文首 TL;DR）  
4. 表/模块不清 → `architecture/overview.md`（先看文首 TL;DR）  

## 短路

- `直接修复`：小 bug、范围清楚 → 可跳过 grill；实现后仍 verify，提交走 **Adhoc** 确认（除非用户已明确授权本轮闭环）。
- 同一问题失败两次 → 停，复盘后再问。

## 禁止

- 未 shared understanding 就写 `src/` / `server/src/` 生产代码（直接修复除外）
- Closed-loop 外擅自 commit/push
- Secret 入仓；把部署写成「已有自动 CD」（当前为手动 `deploy:tencent`）

## 常用命令

```bash
bash scripts/new-feature.sh <slug>
npm run verify
bash scripts/verify-local.sh --skip-e2e
npm run req:list
```
