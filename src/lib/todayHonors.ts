import {
  listPublicHonorBadges,
  type PublicHonorBadge,
} from './communityBadges'

export type HonorCategory = 'exercise' | 'meal' | 'general'

export type TodayHonor = {
  key: PublicHonorBadge
  title: string
  icon: string
  desc: string
  category: HonorCategory
}

export type BadgeInput = {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
}

type TodayHonorStripTone = 'champion' | 'elite' | 'foodKing'

/** 今日页 / 社区 compact 称号条文案（展示用，不触发规则） */
export const TODAY_HONOR_STRIP: Record<
  PublicHonorBadge,
  {
    icon: string
    title: string
    desc: string
    tone: TodayHonorStripTone
  }
> = {
  champion: {
    icon: '👑',
    title: '运动大王',
    desc: '训练、补给、缺口都在线，今天很硬核',
    tone: 'champion',
  },
  elite: {
    icon: '🔥',
    title: '减脂先锋',
    desc: '当前缺口已超过 500 kcal，今天的节奏很稳',
    tone: 'elite',
  },
  foodKing: {
    icon: '🥘',
    title: '美食大王',
    desc: '饮食补给已拉满，今天吃得很认真',
    tone: 'foodKing',
  },
}

export function classifyHonorCategory(key: PublicHonorBadge): HonorCategory {
  if (key === 'champion' || key === 'elite') return 'exercise'
  if (key === 'foodKing') return 'meal'
  return 'general'
}

export function buildTodayHonors(input: BadgeInput): TodayHonor[] {
  return listPublicHonorBadges(input).map((key) => {
    const meta = TODAY_HONOR_STRIP[key]
    return {
      key,
      title: meta.title,
      icon: meta.icon,
      desc: meta.desc,
      category: classifyHonorCategory(key),
    }
  })
}
