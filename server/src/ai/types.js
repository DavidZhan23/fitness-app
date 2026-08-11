/**
 * @typedef {Object} KcalEstimateInput
 * @property {'exercise'|'meal'} kind
 * @property {string} description
 * @property {{ weight_kg?: number|null }} [profile]
 * @property {'text'|'image'} [modality]
 * @property {Buffer[]} [images]
 * @property {string} [imageDataUrl]
 * @property {string[]} [imageDataUrls]
 */

/**
 * @typedef {Object} KcalEstimateItem
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {number} kcal 单位热量（该 unit 的 kcal/单位；行总热 = quantity × kcal）
 * @property {number} [protein_g] 饮食每单位蛋白质克数
 * @property {number} [fat_g] 饮食每单位脂肪克数
 * @property {number} [carbs_g] 饮食每单位碳水克数
 * @property {number} [sugar_g] 饮食每单位糖克数（不高于 carbs_g）
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
