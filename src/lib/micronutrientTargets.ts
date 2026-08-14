import type { MicronutrientId } from '../types'
import {
  MICRONUTRIENT_IDS,
  MICRONUTRIENT_UNITS,
  formatMicronutrientAmount,
  resolveMicronutrientTargets as resolveSharedMicronutrientTargets,
} from '../../server/src/micronutrientTargets.js'
import { ageFromBirthdayKey, normalizeBirthdayFromApi } from './birthday'

export {
  MICRONUTRIENT_IDS,
  MICRONUTRIENT_UNITS,
  formatMicronutrientAmount,
}

export function resolveMicronutrientTargets(profile?: {
  sex?: string | null
  birthday?: string | null
  age?: number | null
} | null) {
  const birthday = normalizeBirthdayFromApi(profile?.birthday)
  const age =
    (birthday ? ageFromBirthdayKey(birthday) : null) ??
    (Number.isFinite(Number(profile?.age)) ? Number(profile?.age) : null)
  return resolveSharedMicronutrientTargets({
    sex: profile?.sex,
    age,
  })
}

export function micronutrientUnit(id: MicronutrientId) {
  return MICRONUTRIENT_UNITS[id]
}
