# Milestone: 架构 grill 结论落文档

**Status:** done
**Branch:** `dev/huanghongli`
**Started:** 2026-07-28

## 1. 任务背景

对当前架构做 grill-me，冻结主轴、文档优先级、用户边界、日界、公式共享方向。

## 2. 目标 (Goal)

把 shared understanding 写入 overview + ADR；公式搬迁代码另开 milestone。

## 3. 成功标准 (Success criteria)

- [x] overview TL;DR：账本主轴、熟人圈子、两种「日」、公式共享方向
- [x] ADR-0008 accepted；ADR-0003 deprecated
- [x] ADR-0004 写清两种「日」
- [ ] （后续）`packages/calories` 搬迁代码 milestone

## 4. Non-goals

- 本轮不搬 `calories`/`metabolism` 代码
- 不改 dateKey 实现
- 不改产品功能代码

## 5. 已阅读的相关文档

- [x] `docs/architecture/overview.md`
- [x] `docs/architecture/api-contract.md`
- [x] `docs/decisions/0003-formula-sync.md` / `0004-date-tz-strategy.md`

## 6. 已检查的可复用代码

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 热量公式 | `src/lib/calories.ts` / `server/src/calories.js` | 文档指向；代码归并见 ADR-0008 |
| 代谢 | `metabolism.ts` / `.js` | 同上 |

## 7–15

Shared understanding 见会话 grill 结论；实施细节见 ADR-0008。
