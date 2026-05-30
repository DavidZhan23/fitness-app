import type { CommunityDayBadge } from '../lib/communityBadges'

export function resolveMemberCardFxClass(
  badge: CommunityDayBadge | null,
): '' | 'community-card-champion' | 'community-card-elite' {
  if (badge === 'champion') return 'community-card-champion'
  if (badge === 'elite') return 'community-card-elite'
  return ''
}

export function CommunityMemberHonorFx({
  badge,
}: {
  badge: CommunityDayBadge | null
}) {
  if (badge === 'elite') {
    return (
      <>
        <span
          className="community-card-elite__ember community-card-elite__ember--l"
          aria-hidden
        >
          🔥
        </span>
        <span
          className="community-card-elite__ember community-card-elite__ember--c"
          aria-hidden
        >
          🔥
        </span>
        <span
          className="community-card-elite__ember community-card-elite__ember--r"
          aria-hidden
        >
          🔥
        </span>
      </>
    )
  }

  if (badge === 'champion') {
    return (
      <>
        <span className="community-card-champion__aura" aria-hidden />
        <span className="community-card-champion__edge" aria-hidden />
        <span
          className="community-card-champion__orb community-card-champion__orb--1"
          aria-hidden
        />
        <span
          className="community-card-champion__orb community-card-champion__orb--2"
          aria-hidden
        />
        <span
          className="community-card-champion__sparkle community-card-champion__sparkle--tl"
          aria-hidden
        >
          ✦
        </span>
        <span
          className="community-card-champion__sparkle community-card-champion__sparkle--tr"
          aria-hidden
        >
          ✦
        </span>
        <span
          className="community-card-champion__sparkle community-card-champion__sparkle--br"
          aria-hidden
        >
          ✦
        </span>
      </>
    )
  }

  return null
}
