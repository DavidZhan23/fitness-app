/**
 * @typedef {Object} KcalEstimateInput
 * @property {'exercise'|'meal'} kind
 * @property {string} description
 * @property {{ weight_kg?: number|null }} [profile]
 * @property {'text'|'image'} [modality]
 * @property {Buffer[]} [images]
 * @property {string} [imageDataUrl]
 */

/**
 * @typedef {Object} KcalEstimateItem
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {number} kcal
 */

/**
 * @typedef {Object} KcalEstimateResult
 * @property {number} kcal
 * @property {string} providerId
 * @property {KcalEstimateItem[]} [items]
 * @property {Record<string, unknown>} [meta]
 */

/**
 * @typedef {(input: KcalEstimateInput) => Promise<KcalEstimateResult>} KcalEstimator
 */

export const AI_PROVIDER_TYPES = true
