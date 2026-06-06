import { describe, expect, it } from 'vitest'

describe('MEAL_PHOTO_DAILY_LIMIT', () => {
  it('defaults to 30 per day', async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters!!'
    const { MEAL_PHOTO_DAILY_LIMIT } = await import('../src/mealPhotoQuota.js')
    expect(MEAL_PHOTO_DAILY_LIMIT).toBe(30)
  })
})
