export const MICRONUTRIENT_IDS = [
  'vit_a',
  'vit_c',
  'vit_d',
  'vit_e',
  'vit_k',
  'vit_b1',
  'vit_b2',
  'vit_b6',
  'vit_b9',
  'vit_b12',
  'calcium',
  'iron',
  'zinc',
  'magnesium',
  'potassium',
  'iodine',
]

export const MICRONUTRIENT_UNITS = {
  vit_a: 'µg',
  vit_c: 'mg',
  vit_d: 'µg',
  vit_e: 'mg',
  vit_k: 'µg',
  vit_b1: 'mg',
  vit_b2: 'mg',
  vit_b6: 'mg',
  vit_b9: 'µg',
  vit_b12: 'µg',
  calcium: 'mg',
  iron: 'mg',
  zinc: 'mg',
  magnesium: 'mg',
  potassium: 'mg',
  iodine: 'µg',
}

export const MICRONUTRIENT_AMOUNT_CAPS = {
  vit_a: 5000,
  vit_c: 2000,
  vit_d: 100,
  vit_e: 200,
  vit_k: 2000,
  vit_b1: 50,
  vit_b2: 50,
  vit_b6: 100,
  vit_b9: 2000,
  vit_b12: 50,
  calcium: 3000,
  iron: 80,
  zinc: 80,
  magnesium: 1500,
  potassium: 8000,
  iodine: 1000,
}

const CHILD = {
  male: {
    vit_a: 600, vit_c: 80, vit_d: 10, vit_e: 11, vit_k: 60,
    vit_b1: 1, vit_b2: 1, vit_b6: 1.1, vit_b9: 300, vit_b12: 2,
    calcium: 1000, iron: 13, zinc: 9, magnesium: 250, potassium: 1500, iodine: 90,
  },
  female: {
    vit_a: 600, vit_c: 80, vit_d: 10, vit_e: 11, vit_k: 60,
    vit_b1: 1, vit_b2: 1, vit_b6: 1.1, vit_b9: 300, vit_b12: 2,
    calcium: 1000, iron: 18, zinc: 8.5, magnesium: 250, potassium: 1500, iodine: 90,
  },
}

const ADULT = {
  male: {
    vit_a: 800, vit_c: 100, vit_d: 10, vit_e: 14, vit_k: 80,
    vit_b1: 1.4, vit_b2: 1.4, vit_b6: 1.4, vit_b9: 400, vit_b12: 2.4,
    calcium: 800, iron: 12, zinc: 12.5, magnesium: 330, potassium: 2000, iodine: 120,
  },
  female: {
    vit_a: 700, vit_c: 100, vit_d: 10, vit_e: 14, vit_k: 80,
    vit_b1: 1.2, vit_b2: 1.2, vit_b6: 1.4, vit_b9: 400, vit_b12: 2.4,
    calcium: 800, iron: 20, zinc: 7.5, magnesium: 330, potassium: 2000, iodine: 120,
  },
}

const OLDER = {
  male: {
    ...ADULT.male,
    vit_d: 15,
    vit_b6: 1.6,
    calcium: 1000,
  },
  female: {
    ...ADULT.female,
    vit_d: 15,
    vit_b6: 1.6,
    calcium: 1000,
    iron: 12,
  },
}

const TABLES = { child: CHILD, adult: ADULT, older: OLDER }

const AGE_BAND_LABELS = {
  child: '儿童',
  adult: '成年',
  older: '老年',
}

const SEX_LABELS = {
  male: '男性',
  female: '女性',
}

export function resolveMicronutrientAgeBand(age) {
  const value = Number(age)
  if (!Number.isFinite(value) || value <= 0) return 'adult'
  if (value < 18) return 'child'
  if (value >= 65) return 'older'
  return 'adult'
}

function sexKey(sex) {
  return sex === 'male' || sex === 'female' ? sex : null
}

function amountsFor(ageBand, sex) {
  const table = TABLES[ageBand] ?? TABLES.adult
  if (sex === 'male' || sex === 'female') return { ...table[sex] }
  return Object.fromEntries(
    MICRONUTRIENT_IDS.map((id) => [
      id,
      Math.max(table.male[id], table.female[id]),
    ]),
  )
}

export function resolveMicronutrientTargets({ sex, age } = {}) {
  const ageBand = resolveMicronutrientAgeBand(age)
  const resolvedSex = sexKey(sex)
  const amounts = amountsFor(ageBand, resolvedSex)
  const sexLabel = resolvedSex ? SEX_LABELS[resolvedSex] : '性别未填'
  return {
    ageBand,
    sex: resolvedSex,
    label: `${AGE_BAND_LABELS[ageBand]}${sexLabel}`,
    items: MICRONUTRIENT_IDS.map((id) => ({
      id,
      amount: amounts[id],
      unit: MICRONUTRIENT_UNITS[id],
    })),
    amounts,
  }
}

export function formatMicronutrientAmount(amount, unit) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return `— ${unit}`
  const rounded =
    unit === 'mg' && value >= 10
      ? Math.round(value)
      : Math.round(value * 10) / 10
  return `${rounded} ${unit}`
}
