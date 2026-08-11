import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('runMigrations community visibility regression', () => {
  it('does not repeat the one-time onboarding visibility backfill at startup', async () => {
    const source = await readFile(
      new URL('../src/db.js', import.meta.url),
      'utf8',
    )

    expect(source).not.toMatch(
      /set\s+community_visible\s*=\s*true[\s\S]{0,200}where\s+onboarding_complete\s*=\s*true/i,
    )
    expect(source).toContain(
      '禁止在启动兼容路径重复加入数据 UPDATE',
    )
  })
})
