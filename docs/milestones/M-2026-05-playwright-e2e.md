# Milestone: Playwright E2E Smoke

**Status:** active
**Branch:** `feat/playwright-e2e-smoke`
**Issue:** — (内部工程改善)
**Started:** 2026-05-24

## 1. 任务背景

项目已有 Vitest 纯函数测试，但缺少浏览器端主流程验证。路由拆分（Stage 3）后，需要 Playwright E2E 冒烟测试模拟真实用户点击，防止 UI/鉴权/表单回归。

## 2. 目标 (Goal)

引入 Playwright，覆盖「注册 → onboarding → 记运动 → 今日验证 → Tab 导航」主流程；本地一条命令可跑，CI 新增 merge gate job。

## 3. 成功标准 (Success criteria)

- [ ] `playwright.config.ts` + `e2e/smoke.spec.ts` 主流程通过
- [ ] `npm run test:e2e` 本地可跑
- [ ] CI `e2e` job 绿（PostgreSQL service + API + Vite）
- [ ] GETTING-START + milestones README 同步

## 4. Non-goals

- AI 估算 kcal、社区互动、删除/编辑记录
- 跨浏览器矩阵（仅 Chromium mobile）
- data-testid 大规模添加

## 5. 已阅读的相关文档（必填）

- [x] `docs/milestones/M-2026-05-refactor-stage3.md`
- [x] `docs/GETTING-START.md`
- [x] `.github/workflows/ci.yml`

## 6. 已检查的可复用代码（必填）

| 想做的事 | 已有实现 | 是否复用 |
|----------|----------|----------|
| 单元测试 | vitest | 否，E2E 独立层 |
| CI job 模式 | ci.yml test job | 是，照格式新增 e2e |

## 7. Inputs / Outputs

| 输入 | 输出 |
|------|------|
| 主流程页面 | Playwright spec + CI job |

## 8. Edge cases

- LoginPage「注册」按钮与切换按钮同名 → `exact: true`
- 新用户必经 onboarding
- CI 需 PostgreSQL service

## 9. 涉及文件 / 模块（预期）

- `playwright.config.ts`, `e2e/**`
- `package.json`, `.github/workflows/ci.yml`
- `.gitignore`, `docs/GETTING-START.md`

## 10. 实现步骤

1. 安装 @playwright/test
2. playwright.config.ts + e2e spec
3. CI e2e job
4. 文档同步

## 11. 测试方案

- `npm run test:e2e`
- `npm run lint && npm run typecheck`

## 12. 风险与缓解

| Risk | Mitigation |
|------|------------|
| CI 慢 | 1 spec + Chromium + browser cache |
| 选择器 flaky | role/label + exact match |

## 13. 文档同步计划

- [ ] GETTING-START §5
- [ ] milestones README

## 14. 回滚方案

- `git revert`；无 schema 变更

## 15. 是否满足最小可运行闭环

是——测试层独立，不影响生产行为。
