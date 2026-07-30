# Milestone: 去语音 + AI 单位热量联动

**Status:** active
**Branch:** `feat/ai-log-no-voice-per-unit-kcal`
**Issue:**
**Started:** 2026-07-28

## 1. 任务背景

记饮食 / AI 作曲器中的 Web Speech 语音输入入口干扰主路径，且 AI 返回的 `items[].kcal` 被当作行总热，用户改数量后热量不会按单位热同步，与模板 chip 的 `kcalPerUnit` 行为不一致。

## 2. 目标 (Goal)

1. 记录流程不再出现语音输入按钮、文案与 Web Speech 逻辑（AI 对话框 + 手动记饮食名称旁）。
2. AI `items[].kcal` = **单位热量**；用户改 `quantity` 时，行热量与合计按 `round(quantity × kcalPerUnit)` 同步。

## 3. 成功标准 (Success criteria)

- [ ] AI / 手动记饮食界面无语音按钮与相关报错文案
- [ ] AI 返回多项后改某一项数量，该行热量与「合计约 N kcal」按单位热比例变化；保存写入同步后的总热
- [ ] `npm run verify` 通过；涉及 AI 的既有 e2e 仍绿

## 4. Non-goals

- 不接服务端语音识别 / 新 STT
- 不改手动模板 chip 的既有 `kcalPerUnit` 行为
- 不改拍照 OCR 主流程，仅统一 items 热量语义
- 不碰狐狸 `FoxSpeechBubble`（非输入）

## 5. 已阅读的相关文档（必填）

- [x] 本 milestone 文档
- [x] `docs/architecture/api-contract.md`（AI estimate items）
- [ ] `docs/architecture/overview.md` ER 节（无表变更）
- [x] 其它：`src/lib/logTemplate.ts#computeDraftKcal`

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 数量 × 单位热 → 行总热 | `src/lib/logTemplate.ts#computeDraftKcal` | 是 |
| AI 解析归一化 | `server/src/ai/providers/deepseekText.js#buildEstimateResult` | 是（改语义） |
| 模板存档 | `saveTemplatesFromItems` / `kcalPerUnit` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| AI 文本/拍照估算响应 `items[].kcal`（单位热） | 前端 `kcalPerUnit`；顶层 `kcal` = Σ round(qty × perUnit) |
| 用户改 quantity / 单位热 | 行总热与合计重算；落库为同步后总热 |

## 8. Edge cases

- 缺单位：meal 默认「份」、exercise 默认「分钟」；quantity 默认 1
- 单位热 ≤ 0 / 非法：校验拒绝保存
- 仅有顶层 `kcal`、无 items：fallback 为 quantity=1、单位热=总热
- 不支持语音：不再展示相关 UI（本里程碑直接移除）

## 9. 涉及文件 / 模块（预期）

- `src/features/log/AiLogSection.tsx`
- `src/features/log/SecondaryManualLogSection.tsx`
- `src/lib/logTemplate.ts` + `__tests__/logTemplate.test.ts`
- `src/pages/LogPage.tsx`（模板存档用 kcalPerUnit）
- `src/index.css`（语音按钮样式）
- `e2e/site-responsive.spec.ts`
- `server/src/ai/types.js`、`deepseekText.js`、`qwenVision.js`
- `server/test/deepseekEstimateParse.test.js`
- `docs/architecture/api-contract.md`、根 `README.md`（若提及语音）

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 开分支 + 本 milestone + 索引
2. 移除两处语音逻辑 / CSS / e2e
3. 服务端 prompt + normalize：item.kcal=单位热；顶层重算
4. 前端状态 / UI / validate / save + 单测
5. `npm run verify`

**后续（不做）：**

- 服务端 STT

## 11. 测试方案

- 纯函数：`server/test/deepseekEstimateParse.test.js`；`src/lib/__tests__/logTemplate.test.ts`（改数量 → 总热同步）
- Smoke：`npm run verify`
- 手动：AI 估算多项后改数量，确认行热与合计变化后保存

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 模型仍返回「行总热」语义 | prompt 明确单位热；normalize 按 qty×perUnit 重算顶层 |
| e2e 仍断言语音按钮 | 同步改 site-responsive |

## 13. 文档同步计划（合并前必须完成）

- [x] `docs/architecture/api-contract.md`
- [ ] `docs/architecture/overview.md` ER（无）
- [ ] `docs/architecture/deploy.md`（无）
- [x] 根 `README.md`「功能」一节（若提及语音则删）
- [ ] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert PR
- DB：无 schema 变更
- 部署：上一 release `dist` symlink

## 15. 是否满足最小可运行闭环

是——用户可无语音完成 AI/手动记录，且改数量后热量与模板语义一致。
