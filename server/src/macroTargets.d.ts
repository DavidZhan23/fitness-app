export type SharedMacroTargetTier =
  | 'high-oil-sugar'
  | 'normal'
  | 'low-oil-sugar'

export interface SharedMacroTargets {
  protein_g: number
  fat_g: number
  carbs_g: number
  sugar_g: number
}

export function calculateMacroTargetsFromMetabolism(
  input?: {
    sex?: string | null
    weightKg?: number | null
    activityFactor?: number | null
    tdee?: number | null
    deficitThreshold?: number | null
  },
  tier?: SharedMacroTargetTier,
): SharedMacroTargets
