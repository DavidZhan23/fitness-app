export type AiEstimateConfidence = 'high' | 'medium' | 'low'

export const CONFIDENCE_LABELS: Record<AiEstimateConfidence, string> = {
  high: '可信度较高',
  medium: '估算可参考',
  low: '份量不明确',
}

export const FALLBACK_REASON = '按整体描述估算，可按实际份量调整'

export function normalizeConfidence(raw: unknown): AiEstimateConfidence {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

export function defaultReason(confidence: AiEstimateConfidence): string {
  switch (confidence) {
    case 'high':
      return '按明确份量估算'
    case 'low':
      return '描述较模糊，按普通份量估算'
    default:
      return '按常见份量估算'
  }
}

export function resolveReason(
  raw: unknown,
  confidence: AiEstimateConfidence,
): string {
  const text = String(raw ?? '').trim()
  return text || defaultReason(confidence)
}
