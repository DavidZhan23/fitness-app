# ADR-0001: 保持 public 仓库

**Status:** accepted  
**Date:** 2026-05-22

## Context

个人/家庭健身 PWA，需低成本 CI，多人协作以 contributor + owner 为主。

## Decision

仓库保持 **public**，使用 GitHub Actions 免费额度跑 smoke CI（lint、typecheck、build）。

## Consequences

- CI 分钟无限制（public）
- 代码公开；Secrets 仅放 GitHub Actions，不进仓库
- 若未来需私有，可迁移并评估 Actions 分钟配额
