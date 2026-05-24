/** Shared formula vectors — frontend + server parity tests must stay in sync */

export const bmrCases = [
  { weightKg: 70, heightCm: 175, age: 30, sex: 'male', expected: 1649 },
  { weightKg: 55, heightCm: 162, age: 28, sex: 'female', expected: 1262 },
]

export const tdeeCases = [
  { bmr: 1649, activityFactor: 1.375, expected: 2267 },
  { bmr: 1296, activityFactor: 1.2, expected: 1555 },
]

export const spreadDeficitCases = [
  {
    dailyBmr: 2000,
    exerciseKcal: 300,
    mealKcal: 800,
    dateKey: '2026-05-24',
    now: new Date('2026-05-24T12:00:00'),
    expected: 500,
  },
]
