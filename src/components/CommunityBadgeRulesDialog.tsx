import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BADGE_THRESHOLDS } from '../lib/communityBadges'

interface CommunityBadgeRulesDialogProps {
  open: boolean
  onClose: () => void
}

const INTRO =
  '全卡特效只会出现在今日公开名片上。减脂先锋会触发火焰特效，运动大王会触发金色光晕；同时达成时优先显示运动大王特效。'

const RULES = [
  {
    pillClass: 'community-pill community-pill--elite',
    emoji: '🔥',
    label: '减脂先锋',
    description: `热量缺口超过 ${BADGE_THRESHOLDS.eliteDeficit} kcal，且当天已记录饮食。`,
    cardFx: '今日公开名片会显示火焰边框特效。',
    cardFxHasEffect: true,
  },
  {
    pillClass: 'community-pill community-pill--champion',
    emoji: '👑',
    label: '运动大王',
    description: `热量缺口超过 ${BADGE_THRESHOLDS.championDeficit} kcal，运动消耗超过 ${BADGE_THRESHOLDS.championExercise} kcal，饮食达到 ${BADGE_THRESHOLDS.championMeal} kcal。`,
    cardFx: '今日公开名片会显示金色光晕特效。',
    cardFxHasEffect: true,
  },
  {
    pillClass: 'community-pill community-pill--foodKing',
    emoji: '🥘',
    label: '美食大王',
    description: `饮食达到基础代谢的 ${BADGE_THRESHOLDS.foodKingMealBmrRatio} 倍。`,
    cardFx: '仅显示称号胶囊，不触发全卡特效。',
    cardFxHasEffect: false,
  },
] as const

export function CommunityBadgeRulesDialog({
  open,
  onClose,
}: CommunityBadgeRulesDialogProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="community-badge-rules-dialog fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-badge-rules-dialog-title"
    >
      <button
        type="button"
        className="community-badge-rules-dialog__backdrop absolute inset-0"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="community-badge-rules-dialog__panel relative w-full max-w-sm">
        <div className="community-badge-rules-dialog__body">
          <h2
            id="community-badge-rules-dialog-title"
            className="community-badge-rules-dialog__title"
          >
            称号规则
          </h2>
          <p className="community-badge-rules-dialog__intro">{INTRO}</p>
          <ul className="community-badge-rules-dialog__list">
            {RULES.map((rule) => (
              <li
                key={rule.label}
                className="community-badge-rules-dialog__item"
              >
                <span
                  className={`${rule.pillClass} community-badge-rules-dialog__pill inline-flex shrink-0 items-center gap-1`}
                >
                  <span aria-hidden>{rule.emoji}</span>
                  {rule.label}
                </span>
                <p className="community-badge-rules-dialog__desc">
                  达成条件：{rule.description}
                </p>
                <p
                  className={`community-badge-rules-dialog__fx-note${
                    rule.cardFxHasEffect
                      ? ' community-badge-rules-dialog__fx-note--has-effect'
                      : ''
                  }`}
                >
                  全卡特效：{rule.cardFx}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="community-badge-rules-dialog__footer">
          <button
            type="button"
            className="community-badge-rules-dialog__confirm"
            onClick={onClose}
          >
            知道了
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
