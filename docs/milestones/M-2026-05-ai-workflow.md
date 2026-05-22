# Milestone: CI/CD and contributor workflow

**Status:** done  
**Branch:** `feat/ci-cd-workflow`  
**Started:** 2026-05-22

## Goal

Contributor 用 Cursor rules 澄清需求 → 实现 → 人工 confirm → push feat 分支 → CI → draft PR → owner merge。预埋 owner 自动部署自助包与文档体系。

## Success criteria

- [x] `.cursor/rules/` ×6 + `scripts/ai-flow.sh` + `new-feature.sh`
- [x] husky + commitlint
- [x] `.github/workflows/ci.yml` + PR/Issue templates + CODEOWNERS
- [x] `CONTRIBUTING.md` + `docs/architecture/*` + ADRs
- [x] `deploy.yml.template` + owner setup guide + rule `05-owner-cd-setup`
- [x] release-please workflow (M4)

## Non-goals

- staging 环境
- Vitest / Playwright E2E
- `ai-flow.sh` fork 自动检测
- `bootstrap.sh` 一键装环境

## Risks

| Risk | Mitigation |
|------|------------|
| owner 未配 branch protection | ADR-0002 + M2 PR description |
| AI 误 push main | rules + ai-flow.sh + protection |
