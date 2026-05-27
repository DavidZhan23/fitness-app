/**
 * Backward compatibility entry.
 * New code should import from `server/src/ai/providers/deepseekText.js`.
 */

export {
  getDeepSeekApiKey,
  estimateKcalFromDescription,
  deepseekTextEstimator,
  DEEPSEEK_TEXT_PROVIDER_ID,
} from './ai/providers/deepseekText.js'
