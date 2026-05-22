## Summary

Bootstrap contributor workflow: Cursor rules, `ai-flow.sh`, CI smoke, docs, owner CD self-service package, release-please.

## Owner checklist after merge

1. **Branch protection** on `main`: Require PR, 1 approval, **Require review from Code Owners**, required status checks (`typecheck`, `build`, `server-syntax`), do not allow bypass.
2. **Code review**: Ensure @DavidZhan23 is default reviewer (CODEOWNERS already added).
3. **Optional auto-deploy**: [docs/architecture/owner-setup-guide.md](../docs/architecture/owner-setup-guide.md) — copy `deploy.yml.template` → `deploy.yml`, add 4 `TENCENT_*` Secrets.

## Notes

- `lint` CI job uses `continue-on-error` due to legacy ESLint debt in `src/`; merge gates are typecheck + build + server-syntax.
