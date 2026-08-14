export const MICRONUTRIENT_IDS: readonly string[]
export const MICRONUTRIENT_UNITS: Record<string, 'mg' | 'µg'>
export const MICRONUTRIENT_AMOUNT_CAPS: Record<string, number>

export type MicronutrientAgeBand = 'child' | 'adult' | 'older'

export function resolveMicronutrientAgeBand(age?: number | null): MicronutrientAgeBand

export function resolveMicronutrientTargets(input?: {
  sex?: string | null
  age?: number | null
}): {
  ageBand: MicronutrientAgeBand
  sex: 'male' | 'female' | null
  label: string
  items: { id: string; amount: number; unit: 'mg' | 'µg' }[]
  amounts: Record<string, number>
}

export function formatMicronutrientAmount(
  amount: number | null | undefined,
  unit: string,
): string
