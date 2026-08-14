import { describe, expect, it } from 'vitest'
import { resolveMicronutrientTargets } from '../micronutrientTargets'

describe('micronutrient DRI targets', () => {
  it('uses a higher iron reference for adult women and missing sex', () => {
    const female = resolveMicronutrientTargets({ sex: 'female', age: 30 })
    const male = resolveMicronutrientTargets({ sex: 'male', age: 30 })
    const unknown = resolveMicronutrientTargets({ age: 30 })
    expect(female.amounts.iron).toBeGreaterThan(male.amounts.iron)
    expect(unknown.amounts.iron).toBe(female.amounts.iron)
    expect(female.label).toBe('成年女性')
    expect(female.items).toHaveLength(16)
  })

  it('raises calcium for children and older adults', () => {
    const child = resolveMicronutrientTargets({ sex: 'female', age: 10 })
    const adult = resolveMicronutrientTargets({ sex: 'female', age: 30 })
    const older = resolveMicronutrientTargets({ sex: 'female', age: 70 })
    expect(child.ageBand).toBe('child')
    expect(adult.ageBand).toBe('adult')
    expect(older.ageBand).toBe('older')
    expect(child.amounts.calcium).toBeGreaterThan(adult.amounts.calcium)
    expect(older.amounts.calcium).toBeGreaterThan(adult.amounts.calcium)
  })
})
