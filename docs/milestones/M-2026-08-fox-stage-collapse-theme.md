# Milestone: 小狸舞台可收起并随皮肤换色

**Status:** done
**Branch:** `dev/huanghongli`
**Started:** 2026-08-13

## 1. 任务背景

今日页已解锁的小狸舞台始终占据较大空间，且卡片与舞台的蜜桃金/粉紫配色写死在组件 CSS 中，无法随 12 套主题正确变化。

## 2. 目标 (Goal)

让已解锁的小狸舞台可收起并在本机刷新后保持状态；把狐狸卡片和舞台装饰色迁移为 12 套主题各自定义的语义 token。

## 3. 成功标准 (Success criteria)

- [x] 已解锁舞台默认展开，可从卡片右上收起，并以约 3rem 单行条展开回来。
- [x] 收起偏好双写 localStorage 与 Cookie，刷新后保持；未解锁提示不出现折叠控制。
- [x] 收起时停止舞台动画，并跳过进场台词与 34 秒主动关怀。
- [x] 12 套主题分别定义并消费完整 `--fox-*` token，舞台不再写死蜜桃金/粉紫或依赖系统深色模式。
- [x] 单测、拟人探查与 `npm run verify` 通过。

## 4. Non-goals

- 不改狐狸资格、DeepSeek prompt、狐狸贴图、周报、设置页、profile、API 或数据库。
- 不新增舞台开关入口、图表库或平行持久化模块。

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-08-fox-stage-collapse-theme.md` 自身
- [x] `docs/decisions/0007-theme-tokens.md`
- [x] `src/styles/themes/README.md`
- [x] `.cursor/rules/06-reuse-first.mdc`
- [x] `src/components/DajiFoxCompanion.tsx` 与 `src/components/TodayRecordsSection.tsx`

## 6. 已检查的可复用代码（必填，避免造轮子）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 布尔偏好双写本机存储 | `src/lib/themePersistence.ts#readHeroCollabPreference/writeHeroCollabPreference` | 是，扩展同一模块 |
| 可访问的折叠交互 | `src/components/TodayRecordsSection.tsx` 的 button + `aria-expanded` | 是 |
| 主题色隔离 | ADR-0007 与 `src/styles/themes/*.css` 语义 token | 是 |
| 舞台暂停 | `useFoxStateMachine` 的 paused 状态与 `.is-paused` | 是 |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 用户点击收起/展开、当前主题、今日运动 kcal | 持久化的舞台状态与当前主题专属舞台/卡片配色 |

## 8. Edge cases

- localStorage 不可用时读写 Cookie；非法偏好值回退默认展开。
- 未解锁用户只看到提示条，无折叠按钮。
- 窄屏保持单行收起条；`prefers-reduced-motion` 下不执行折叠高度动画。
- 页面后台暂停与用户收起暂停共同生效。

## 9. 涉及文件 / 模块（预期）

- `src/lib/themePersistence.ts` 与对应单测
- `src/components/DajiFoxCompanion.tsx`
- `src/components/fox/useFoxStateMachine.ts`
- `src/styles/themes/*.css`
- `src/index.css`
- `src/lib/__tests__/foxCompanionUi.test.ts`
- `README.md`、`src/styles/themes/README.md`、`docs/milestones/*`

## 10. 实现步骤（MVP 与后续分开）

**MVP（本次必交）：**

1. 扩展现有主题持久化模块和单测。
2. 实现已解锁舞台折叠 UI、暂停与主动台词跳过。
3. 为 12 套主题补齐狐狸 token，并迁移狐狸 CSS。
4. 补静态约束测试、文档、拟人探查和完整 verify。

**后续（不做）：**

- 设置页开关、账号同步、资格规则、AI 或贴图调整。

## 11. 测试方案

- 纯函数单测：`src/lib/__tests__/themePersistence.test.ts`
- UI 静态约束：`src/lib/__tests__/foxCompanionUi.test.ts`
- Smoke：仓库根目录 `npm run verify`
- 手动验证：12 套主题逐套查看展开舞台；收起、刷新、展开；窄屏与 reduced-motion。
- **拟人探查结论**：`self-today` 人设在本地真实账号通过展开 → 收起 → 刷新仍收起 → 展开主路径；收起卡高 50px、舞台隐藏且网格单列；360×800 无横向溢出；12 套主题逐套切换后计算出的舞台渐变/月亮/狐火均匹配各自 token；未解锁提示无折叠按钮；控制台无错误。
- **拟沉淀 e2e**：`e2e/fox-stage-collapse.spec.ts` 可注册并种出运动大王，断言折叠 aria/class、刷新持久化、未解锁无按钮；12 套视觉差异由当前 CSS 静态单测稳定覆盖，避免脆弱截图。

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| 收起状态与后台暂停互相覆盖 | 用“后台 paused 或用户 collapsed”的合并暂停条件，不写 profile 状态 |
| 主题漏 token 导致 CSS 回退不一致 | 静态测试遍历 12 个主题文件校验完整 token 集 |
| 窄屏收起条溢出 | kcal 文案保持紧凑，缩略图固定尺寸，文案区域允许收缩 |

## 13. 文档同步计划（合并前必须完成）

- [x] 无 API / ER / 部署文档变更
- [x] 根 `README.md`「功能」一节
- [x] `src/styles/themes/README.md` token 清单
- [x] 本 milestone Status 改 `done` + `docs/milestones/README.md` 索引更新

## 14. 回滚方案

- 代码：revert 对应提交；无数据库回滚。
- 部署：恢复上一个 release 的 `dist` symlink。

## 15. 是否满足最小可运行闭环

是——已解锁用户可完整执行收起、刷新恢复和重新展开；12 套主题均能即时换色，未解锁边界保持不变。
