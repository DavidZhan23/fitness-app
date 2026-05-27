# Migration Notes

- Migration id `012` is intentionally skipped (historical numbering gap). Do not backfill it; continue from the latest id.
- During Phase 1, `server/src/db.js#runMigrations()` still contains compatibility DDL for legacy databases.
