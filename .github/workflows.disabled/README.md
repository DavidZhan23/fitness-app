## Workflows Disabled (Phase 1)

This repository currently uses a manual delivery model:

1. Developer local verify (`npm run verify`)
2. Direct push to `main`
3. Owner manual deploy

All GitHub Actions workflows are archived in this folder to avoid accidental triggers and process confusion.

### Restore Guide (future CI/CD recovery)

Move selected files back into `.github/workflows/` and reconfigure required secrets/settings:

```bash
mv .github/workflows.disabled/*.yml .github/workflows/
```

Then re-enable any required repository settings (branch protection, secrets, release tooling) as needed.
