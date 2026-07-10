import { afterEach, describe, expect, it } from 'vitest'
import {
  buildPasswordResetUrl,
  equalTokenHash,
  hashResetToken,
  isValidPassword,
  normalizeEmail,
} from '../src/passwordReset.js'
import { extractEmailAddress } from '../src/mailer.js'

const originalBaseUrl = process.env.PASSWORD_RESET_BASE_URL
const originalAppBaseUrl = process.env.APP_BASE_URL
const originalCorsOrigin = process.env.CORS_ORIGIN

afterEach(() => {
  process.env.PASSWORD_RESET_BASE_URL = originalBaseUrl
  process.env.APP_BASE_URL = originalAppBaseUrl
  process.env.CORS_ORIGIN = originalCorsOrigin
})

describe('password reset helpers', () => {
  it('normalizes email and validates minimum password length', () => {
    expect(normalizeEmail('  USER@Example.COM  ')).toBe('user@example.com')
    expect(isValidPassword('12345')).toBe(false)
    expect(isValidPassword('123456')).toBe(true)
  })

  it('hashes tokens and compares hashes safely', () => {
    const hash = hashResetToken('reset-token')

    expect(hash).toHaveLength(64)
    expect(equalTokenHash(hash, hashResetToken('reset-token'))).toBe(true)
    expect(equalTokenHash(hash, hashResetToken('other-token'))).toBe(false)
    expect(equalTokenHash(hash, '')).toBe(false)
  })

  it('builds login reset links from the configured frontend base URL', () => {
    process.env.PASSWORD_RESET_BASE_URL = 'https://fitness.example.com/app'
    delete process.env.APP_BASE_URL
    delete process.env.CORS_ORIGIN

    expect(buildPasswordResetUrl('abc123')).toBe(
      'https://fitness.example.com/login?reset_token=abc123',
    )
  })

  it('extracts the envelope sender from a display-name email address', () => {
    expect(extractEmailAddress('满打满算 <sender@163.com>')).toBe(
      'sender@163.com',
    )
    expect(extractEmailAddress('sender@163.com')).toBe('sender@163.com')
    expect(extractEmailAddress('not an address')).toBe('')
  })
})
