# Milestone: Requirement intake via GitHub

**Status:** done
**Branch:** `feat/req-intake`
**Started:** 2026-05-23

## Goal

用 **GitHub Issue Forms + Projects** 作为唯一需求管理面板：提需求人在 GitHub 手机端通过表单提交（**允许模糊填写**），Cursor 用 `gh` / `req:list` 拉取自己的待办并接入 `ai-flow.sh` / CI / CD。状态由 issue / PR / label / Action 维护。

## User flows

### 提需求（手机 / 网页）

1. New issue → *Feature request* 或 *Bug report*
2. **标题一句话即可**；详情等字段可选
3. 自动 `status:todo`、优先级标签、assign 给作者；若配置了 `REQUIREMENTS_PROJECT_URL` 则进看板

### Cursor 开发

1. `npm run req:list` 或说「列我的待办」
2. 「开始 #N」→ `new-feature.sh` → 澄清 → 实现 → `ai-flow.sh`
3. PR 含 `Closes #N` → `status:doing`；merge 后 issue 关闭

## Success criteria

- [x] `.github/ISSUE_TEMPLATE/feature_request.yml` — 仅标题必填语义；详情/优先级/截图可选
- [x] `.github/ISSUE_TEMPLATE/bug_report.yml` — 现象为主，其余可选
- [x] `.github/workflows/issue-triage.yml` — opened 打标签 + assign；PR 链 issue → doing；可选 add-to-project
- [x] `scripts/setup-req-labels.sh` + `scripts/req-list.sh` + `npm run req:list`
- [x] `docs/requirements/github-project-setup.md` — labels + Project + `REQUIREMENTS_PROJECT_URL`
- [x] `CONTRIBUTING.md` 需求提交流程段
- [x] `docs/milestones/README.md` 索引

## Non-goals

- 腾讯文档 / 外部同步
- 非 GitHub 用户入口
- 自动写 milestone 文件（仍由 Cursor + `new-feature.sh` 完成）

## Owner follow-up（合并后）

1. `bash scripts/setup-req-labels.sh`
2. 按 [github-project-setup.md](../requirements/github-project-setup.md) 建 Project 并设 `REQUIREMENTS_PROJECT_URL`

## Risks

| Risk | Mitigation |
|------|------------|
| labels 未建导致 workflow 打标失败 | 先跑 `setup-req-labels.sh` |
| 未配 Project URL | workflow 跳过 add-to-project，其余仍可用 |
| 优先级解析依赖 issue 正文格式 | 默认 `priority:med`；表单改版时同步 workflow |
