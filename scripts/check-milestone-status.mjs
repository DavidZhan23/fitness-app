#!/usr/bin/env node
// Milestone status reminder (informational, never blocks).
//
// Scans docs/milestones/M-*.md for `**Status:** active` and reports:
//   - how many referenced PRs (by number) are already merged into main
//   - how many `- [ ]` checkboxes vs `- [x]` are completed
//
// When all referenced PRs are merged AND every checkbox is checked, prints
// a hint to flip Status to `done` and update docs/milestones/README.md.
//
// Designed as a soft reminder for the closing PR. Always exits 0.

import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(ROOT, 'docs/milestones');

// PR refs look like "PR #54", "PR: #54", "pull request #54". Issue refs use
// bare "#32" without a PR prefix, so they are intentionally not matched.
const PR_PATTERN = /(?:\bPR[ :]*#|\bpull request\s*#)(\d{1,5})\b/gi;

const ALLOWED_STATUSES = new Set(['active', 'done', 'cancelled']);

function loadMilestones() {
  return readdirSync(DIR)
    .filter((f) => f.startsWith('M-') && f.endsWith('.md'))
    .map((f) => {
      const path = resolve(DIR, f);
      const text = readFileSync(path, 'utf8');
      const m = text.match(/\*\*Status:\*\*\s*([a-zA-Z-]+)/i);
      return { file: f, text, status: m ? m[1].toLowerCase() : 'unknown' };
    });
}

function extractPrs(text) {
  const nums = new Set();
  for (const m of text.matchAll(PR_PATTERN)) nums.add(Number(m[1]));
  return [...nums].sort((a, b) => a - b);
}

function isMerged(pr) {
  // Matches both merge-commit ("Merge pull request #N") and squash-merge
  // ("feat(x): y (#N)") styles. Tiny false-positive risk for #N vs #NNN once
  // PR numbers reach 4+ digits; acceptable for an informational tool.
  try {
    const out = execSync(`git log main --oneline --grep "#${pr}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function countBoxes(text) {
  const total = (text.match(/^\s*-\s*\[[ xX]\]/gm) || []).length;
  const checked = (text.match(/^\s*-\s*\[[xX]\]/gm) || []).length;
  return { total, checked };
}

function main() {
  let milestones;
  try {
    milestones = loadMilestones();
  } catch (err) {
    console.log('==> milestone status (informational, never blocks)');
    console.log(`  (skipped: ${err.message})`);
    return;
  }

  console.log('==> milestone status (informational, never blocks)');
  const unknown = milestones.filter((m) => !ALLOWED_STATUSES.has(m.status));
  for (const m of unknown) {
    console.log(`  ❓ ${m.file}  unknown status "${m.status}" (allowed: active | done | cancelled)`);
  }

  const active = milestones.filter((m) => m.status === 'active');
  if (active.length === 0) {
    if (unknown.length === 0) console.log('  (no active milestones)');
    return;
  }

  for (const m of active) {
    const prs = extractPrs(m.text);
    const merged = prs.filter(isMerged);
    const { total, checked } = countBoxes(m.text);
    const allMerged = prs.length > 0 && merged.length === prs.length;
    const allChecked = total > 0 && checked === total;

    let icon = '·';
    let hint = '';
    if (allMerged && allChecked) {
      icon = '💡';
      hint = '  → 关联 PR 全 merge + checkbox 全勾，建议把 Status 改 done 并同步 README';
    } else if (allMerged && total > 0 && !allChecked) {
      icon = '⚠ ';
      hint = `  → 关联 PR 全 merge 但有 ${total - checked} 项 checkbox 未勾`;
    }

    const prSummary = prs.length === 0
      ? 'no PR refs'
      : `PRs ${merged.length}/${prs.length} merged`;
    const boxSummary = total === 0
      ? 'no checkboxes'
      : `checkboxes ${checked}/${total}`;

    console.log(`  ${icon} ${m.file}  ${prSummary} · ${boxSummary}${hint}`);
  }
}

main();
