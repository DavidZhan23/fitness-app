# ADR-0002: Owner 守门合并与部署

**Status:** accepted  
**Date:** 2026-05-22

## Context

多名开发者可能提交 feature；生产部署涉及服务器 SSH 与 Secrets，不应由 contributor 直接 merge 或部署。

## Decision

1. 所有改动经 **PR → @DavidZhan23 review → merge**
2. `CODEOWNERS` 指定 `* @DavidZhan23`
3. **Branch protection** 由 owner 在 GitHub 配置（硬性约束）
4. **CD** 通过 `deploy.yml.template` 由 owner 自行启用；contributor 不持有部署密钥
5. Contributor 使用 **confirm 闸门**（回复 `go`）后才 commit/push

## Consequences

- merge 与上线节奏依赖 owner 响应
- contributor 流水线在 draft PR + CI 处清晰终止
- owner 可用 Cursor rule `05-owner-cd-setup` 自助配 CD
