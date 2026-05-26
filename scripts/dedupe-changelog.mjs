#!/usr/bin/env node
/**
 * Remove duplicate bullets within each ### section of CHANGELOG.md.
 * release-please lists both merge commits and feature commits when PRs use
 * merge commits instead of squash — see https://github.com/googleapis/release-please/issues/2476
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const changelogPath = join(root, 'CHANGELOG.md');
const checkOnly = process.argv.includes('--check');

/** @param {string} line */
function bulletKey(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('* ')) return null;
  const withLink = trimmed.match(/^\* (.+?) \(\[[0-9a-f]+\]\([^)]+\)\)\s*$/i);
  if (withLink) return withLink[1].trim().toLowerCase();
  const plain = trimmed.match(/^\* (.+)$/);
  return plain ? plain[1].trim().toLowerCase() : null;
}

/** @param {string} content */
export function dedupeChangelog(content) {
  const lines = content.split('\n');
  const out = [];
  const seenInSection = new Set();
  let inSubsection = false;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      inSubsection = true;
      seenInSection.clear();
      out.push(line);
      continue;
    }

    if (line.startsWith('## ')) {
      inSubsection = false;
      seenInSection.clear();
      out.push(line);
      continue;
    }

    if (inSubsection && line.startsWith('* ')) {
      const key = bulletKey(line);
      if (key && seenInSection.has(key)) {
        continue;
      }
      if (key) seenInSection.add(key);
    }

    out.push(line);
  }

  let result = out.join('\n');
  result = result.replace(/\n## Changelog\n\nAll notable changes[\s\S]*$/m, '\n').trimEnd();
  if (!result.endsWith('\n')) result += '\n';
  return result;
}

const before = readFileSync(changelogPath, 'utf8');
const after = dedupeChangelog(before);

if (before === after) {
  if (checkOnly) process.exit(0);
  console.log('CHANGELOG.md: no duplicate bullets to remove');
  process.exit(0);
}

if (checkOnly) {
  console.error('CHANGELOG.md has duplicate bullets; run: npm run changelog:dedupe');
  process.exit(1);
}

writeFileSync(changelogPath, after, 'utf8');
const removed = before.split('\n').length - after.split('\n').length;
console.log(`CHANGELOG.md: removed ${removed} duplicate line(s)`);
