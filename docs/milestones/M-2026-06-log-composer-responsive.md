# Milestone: 记录输入栏跨机型单行适配

**Status:** done
**Branch:** `main`
**Started:** 2026-06-06

## 1. 任务背景

AI 记录输入栏在窄屏设备上可能因提示文字换行而变高；营养表录入把语音、拍照和上传图片放在独立辅助栏中，入口较多且占用空间。

## 2. 目标 (Goal)

让 AI 记录输入栏在所有支持宽度下保持单行，并将营养表录入的语音按钮内嵌到名称输入框，同时移除该页的拍照与上传图片入口。

## 3. 成功标准 (Success criteria)

- [x] AI 记录输入栏在 320px 至桌面宽度始终为单行，长文本横向滚动且页面不横向溢出
- [x] AI 记录的语音、拍照和图片菜单入口保持可用
- [x] 营养表录入不显示拍照、上传图片或图片菜单
- [x] 营养表名称输入框内显示语音按钮，语音结果继续填入名称
- [x] 不支持语音或权限失败时仍可使用键盘输入，并展示错误提示
- [x] 响应式回归测试覆盖 320px、常见手机、平板和桌面宽度

## 4. Non-goals

- 不改 AI 记录的图片识别能力
- 不删除后端营养表图片解析 API
- 不改数据库、热量计算、保存流程或其他页面布局

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-06-log-composer-responsive.md` 自身
- [x] `docs/milestones/_TEMPLATE.md`
- [x] `docs/milestones/M-2026-05-today-page-layers.md` 的响应式测试约定
- [ ] `docs/architecture/api-contract.md`（本次不动 API，跳过）

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 输入栏容器与图标按钮 | `src/index.css` 的 `log-ai-composer*` | 是 |
| 语音识别与名称写入 | `SecondaryManualLogSection.tsx#toggleSpeechInput` | 是 |
| 跨机型矩阵 | `src/lib/responsive.ts#RESPONSIVE_VIEWPORTS` | 是 |
| 页面无横向溢出断言 | `e2e/helpers/layout.ts` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| AI 文字、语音、图片 | 单行 AI 输入栏，原能力保持 |
| 营养表名称键盘或语音输入 | 名称输入框内完成输入 |

## 8. Edge cases

- 320px 窄屏：提示文字可裁切但不换行，按钮不重叠，页面不溢出
- 长文本：输入框内部横向滚动
- 语音不支持 / 无权限 / 识别失败：显示提示，键盘输入不受影响
- loading：输入框和语音按钮同步禁用

## 9. 涉及文件 / 模块（预期）

- `src/features/log/AiLogSection.tsx`
- `src/features/log/SecondaryManualLogSection.tsx`
- `src/index.css`
- `e2e/site-responsive.spec.ts`
- `docs/milestones/M-2026-06-log-composer-responsive.md`
- `docs/milestones/README.md`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 固定 AI composer 为单行输入，不再随文字增高
2. 删除营养表录入的图片入口，将语音按钮放入名称输入框
3. 增加记录页响应式交互与布局断言

**后续（不做）：**

- 抽取 AI 与营养表共用的完整输入组件
- 删除未使用的后端营养表图片解析接口

## 11. 测试方案

- `npm run typecheck`
- `npm run check:site-responsive`
- `npm run verify`

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 长 AI 描述不易查看 | 输入框内部横向滚动，保持键盘光标可追踪 |
| 移除营养表图片入口造成误解 | 同步删除图片提示文案，仅保留键盘和语音入口 |
| 窄屏按钮挤压文字 | 中间输入列使用 `minmax(0, 1fr)`，按钮固定尺寸 |

## 13. 文档同步计划（合并前必须完成）

- [x] 根 `README.md`「功能」一节（本次为入口简化，无需更新）
- [x] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：恢复 AI textarea 自动增高和营养表图片辅助栏
- DB：无 schema 变更

## 15. 是否满足最小可运行闭环

是 — 用户可在 AI 记录和营养表录入中完整输入并保存记录。
