import { deepseekTextEstimator } from './providers/deepseekText.js'
import { qwenVisionEstimator } from './providers/qwenVision.js'

/** @type {Map<string, import('./types.js').KcalEstimator>} */
const estimators = new Map([['deepseek-text', deepseekTextEstimator]])

/** @type {Map<string, import('./types.js').KcalEstimator>} */
const visionEstimators = new Map([['qwen-vl-flash', qwenVisionEstimator]])

/**
 * Register estimator provider for future extension (e.g. vision providers).
 * @param {string} providerId
 * @param {import('./types.js').KcalEstimator} estimator
 */
export function registerKcalEstimator(providerId, estimator) {
  estimators.set(providerId, estimator)
}

/**
 * @param {string | undefined} providerId
 * @returns {import('./types.js').KcalEstimator}
 */
export function getKcalVisionEstimator(
  providerId = process.env.KCAL_VISION_PROVIDER,
) {
  const resolvedId = providerId || 'qwen-vl-flash'
  const estimator = visionEstimators.get(resolvedId)
  if (estimator) return estimator
  console.warn(
    `[ai] unknown vision provider "${resolvedId}", fallback to qwen-vl-flash`,
  )
  return qwenVisionEstimator
}

/**
 * @param {string | undefined} providerId
 * @returns {import('./types.js').KcalEstimator}
 */
export function getKcalEstimator(providerId = process.env.KCAL_PROVIDER) {
  const resolvedId = providerId || 'deepseek-text'
  const estimator = estimators.get(resolvedId)
  if (estimator) return estimator
  console.warn(
    `[ai] unknown provider "${resolvedId}", fallback to deepseek-text`,
  )
  return deepseekTextEstimator
}
