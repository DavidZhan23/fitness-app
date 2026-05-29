import type { AppStyle } from '../context/StyleContext'

export type HeroGreetingLayout = 'single-line' | 'two-line'

export type HeroCollabLayout = 'cover' | 'corner'

export interface HeroCollabConfig {
  label: string
  imageUrl: string
  layout: HeroCollabLayout
  defaultEnabled: boolean
}

export interface HeroGreetingConfig {
  titleTemplate: string
  subtitle: string
  fontFamily: string
  titleSize: string
  fontWeight: string
  lineHeight: string
  letterSpacing: string
  titleColor: string
  nameColor: string
  subtitleColor: string
  layout: HeroGreetingLayout
  background: string
  textShadow: string
}

interface ThemeMeta {
  heroGreeting: HeroGreetingConfig
  heroCollab?: HeroCollabConfig
}

const fallbackHeroGreeting: HeroGreetingConfig = {
  titleTemplate: '欢迎回来，{name}。',
  subtitle: '今天也稳稳推进。',
  fontFamily:
    '"Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  titleSize: 'clamp(36px, 6vw, 52px)',
  fontWeight: '760',
  lineHeight: '1.08',
  letterSpacing: '0.01em',
  titleColor: '#f1f5f9',
  nameColor: '#5eead4',
  subtitleColor: '#94a3b8',
  layout: 'single-line',
  background: 'transparent',
  textShadow: 'none',
}

export const themeMeta: Record<AppStyle, ThemeMeta> = {
  default: {
    heroGreeting: {
      titleTemplate: '深海已点亮，{name}。',
      subtitle: '稳住节奏，持续燃烧。',
      fontFamily:
        '"Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      titleSize: 'clamp(38px, 6.2vw, 56px)',
      fontWeight: '780',
      lineHeight: '1.06',
      letterSpacing: '0.01em',
      titleColor: '#f1fff8',
      nameColor: '#14b8a6',
      subtitleColor: '#9ecdc2',
      layout: 'single-line',
      background: 'transparent',
      textShadow: '0 0 12px rgba(20, 184, 166, 0.22)',
    },
  },
  lavender: {
    heroGreeting: {
      titleTemplate: '晚风很轻，{name}。',
      subtitle: '慢慢记录，也慢慢变好。',
      fontFamily:
        '"Avenir Next", "SF Pro Rounded", "PingFang SC", "Hiragino Sans GB", sans-serif',
      titleSize: 'clamp(38px, 6vw, 54px)',
      fontWeight: '740',
      lineHeight: '1.1',
      letterSpacing: '0.008em',
      titleColor: '#5a4a63',
      nameColor: '#8e6deb',
      subtitleColor: '#8c7b94',
      layout: 'single-line',
      background: 'transparent',
      textShadow: '0 1px 8px rgba(142, 109, 235, 0.18)',
    },
  },
  sakura: {
    heroGreeting: {
      titleTemplate: '欢迎回来，{name} ♡',
      subtitle: '今天也要轻盈一点。',
      fontFamily:
        '"Avenir Next", "SF Pro Rounded", "PingFang SC", "Hiragino Sans GB", sans-serif',
      titleSize: 'clamp(38px, 6vw, 54px)',
      fontWeight: '750',
      lineHeight: '1.1',
      letterSpacing: '0.008em',
      titleColor: '#5d4a5c',
      nameColor: '#4f8fde',
      subtitleColor: '#9a7b92',
      layout: 'single-line',
      background: 'linear-gradient(120deg, rgba(220, 239, 255, 0.35), rgba(255, 241, 247, 0.35))',
      textShadow: 'none',
    },
  },
  'sakura-blush': {
    heroGreeting: {
      titleTemplate: '欢迎回来，{name} ♡',
      subtitle: '今天也要轻盈一点。',
      fontFamily:
        '"Avenir Next", "SF Pro Rounded", "PingFang SC", "Hiragino Sans GB", sans-serif',
      titleSize: 'clamp(38px, 6vw, 54px)',
      fontWeight: '750',
      lineHeight: '1.1',
      letterSpacing: '0.008em',
      titleColor: '#5d4a5c',
      nameColor: '#b75f91',
      subtitleColor: '#9a7b92',
      layout: 'single-line',
      background: 'linear-gradient(120deg, rgba(255, 227, 238, 0.45), rgba(220, 239, 255, 0.28))',
      textShadow: 'none',
    },
  },
  'active-mint': {
    heroGreeting: {
      titleTemplate: '准备好动起来了吗，{name}？',
      subtitle: '今天也保持轻盈节奏。',
      fontFamily:
        '"Inter", "SF Pro Rounded", "PingFang SC", "Hiragino Sans GB", sans-serif',
      titleSize: 'clamp(38px, 6vw, 54px)',
      fontWeight: '770',
      lineHeight: '1.08',
      letterSpacing: '0.008em',
      titleColor: '#35524a',
      nameColor: '#249684',
      subtitleColor: '#6f8780',
      layout: 'single-line',
      background: 'transparent',
      textShadow: 'none',
    },
  },
  eva: {
    heroCollab: {
      label: '展示联名角色',
      imageUrl: '/theme/eva-head-01-cutout.png',
      layout: 'corner',
      defaultEnabled: true,
    },
    heroGreeting: {
      titleTemplate: '同步率上升，{name}。',
      subtitle: '目标：今日缺口达成。',
      fontFamily:
        '"Orbitron", "Rajdhani", "DIN Alternate", "Arial Narrow", "PingFang SC", sans-serif',
      titleSize: 'clamp(34px, 5.8vw, 50px)',
      fontWeight: '900',
      lineHeight: '1.02',
      letterSpacing: '0.02em',
      titleColor: '#ffffff',
      nameColor: '#a7f04b',
      subtitleColor: '#b7a5ff',
      layout: 'two-line',
      background: 'transparent',
      textShadow: '0 0 12px rgba(167, 240, 75, 0.28)',
    },
  },
  'eva-unit02': {
    heroCollab: {
      label: '展示联名角色',
      imageUrl: '/theme/eva-head-02-cutout.png',
      layout: 'corner',
      defaultEnabled: true,
    },
    heroGreeting: {
      titleTemplate: '启动战斗模式，{name}。',
      subtitle: '今天也要漂亮地赢下来。',
      fontFamily:
        '"Orbitron", "Rajdhani", "DIN Alternate", "Arial Narrow", "PingFang SC", sans-serif',
      titleSize: 'clamp(34px, 5.8vw, 50px)',
      fontWeight: '900',
      lineHeight: '1.03',
      letterSpacing: '0.02em',
      titleColor: '#ffffff',
      nameColor: '#ffb84d',
      subtitleColor: '#ffc9a3',
      layout: 'two-line',
      background: 'transparent',
      textShadow: '0 0 10px rgba(255, 75, 62, 0.22)',
    },
  },
  'gundam-hangar': {
    heroCollab: {
      label: '展示联名角色',
      imageUrl: '/theme/gundam-hangar-hero.jpg',
      layout: 'cover',
      defaultEnabled: true,
    },
    heroGreeting: {
      titleTemplate: '系统就绪，{name}。',
      subtitle: '今日任务：稳定执行。',
      fontFamily:
        '"Roboto Condensed", "SFMono-Regular", "Menlo", "PingFang SC", sans-serif',
      titleSize: 'clamp(33px, 5.6vw, 48px)',
      fontWeight: '820',
      lineHeight: '1.05',
      letterSpacing: '0.03em',
      titleColor: '#e7eef7',
      nameColor: '#7fa6c9',
      subtitleColor: '#91a0ae',
      layout: 'single-line',
      background: 'transparent',
      textShadow: 'none',
    },
  },
  'jojo-stardust-duel': {
    heroCollab: {
      label: '展示联名底图',
      imageUrl: '/theme/jojo-stardust-duel-deficit.jpg',
      layout: 'cover',
      defaultEnabled: false,
    },
    heroGreeting: {
      titleTemplate: 'The World——时间暂停。',
      subtitle: '而现在，轮到{name}让时间开始流动。',
      fontFamily:
        '"Orbitron", "Rajdhani", "DIN Alternate", "Arial Narrow", "PingFang SC", sans-serif',
      titleSize: 'clamp(38px, 6vw, 54px)',
      fontWeight: '900',
      lineHeight: '1.04',
      letterSpacing: '0.02em',
      titleColor: '#f4f6ff',
      nameColor: '#9b8cff',
      subtitleColor: '#c2c9e6',
      layout: 'single-line',
      background: 'transparent',
      textShadow: '0 0 12px rgb(49 81 201 / 0.22)',
    },
  },
  'soy-tea': {
    heroGreeting: {
      titleTemplate: '清茶微醒，{name}。',
      subtitle: '今天也轻轻保持。',
      fontFamily:
        '"Songti SC", "STSong", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", serif',
      titleSize: 'clamp(38px, 6vw, 52px)',
      fontWeight: '730',
      lineHeight: '1.12',
      letterSpacing: '0.01em',
      titleColor: '#4f5f4d',
      nameColor: '#798c76',
      subtitleColor: '#7d8b75',
      layout: 'single-line',
      background: 'linear-gradient(120deg, rgba(249, 248, 228, 0.35), rgba(228, 238, 230, 0.45))',
      textShadow: 'none',
    },
  },
  'wood-zen': {
    heroGreeting: {
      titleTemplate: '欢迎回来，{name}。',
      subtitle: '今日也慢慢来，保持节奏。',
      fontFamily:
        '"LXGW WenKai Screen", "STKaiti", "KaiTi", "Songti SC", "PingFang SC", serif',
      titleSize: 'clamp(38px, 6vw, 52px)',
      fontWeight: '700',
      lineHeight: '1.15',
      letterSpacing: '0.012em',
      titleColor: '#4d4033',
      nameColor: '#6f8f5b',
      subtitleColor: '#7c6f60',
      layout: 'two-line',
      background: 'transparent',
      textShadow: 'none',
    },
  },
}

export function getHeroGreetingConfig(style: AppStyle): HeroGreetingConfig {
  return themeMeta[style]?.heroGreeting ?? fallbackHeroGreeting
}

export function getHeroCollabConfig(style: AppStyle): HeroCollabConfig | undefined {
  return themeMeta[style]?.heroCollab
}

export function styleSupportsHeroCollab(style: AppStyle): boolean {
  return getHeroCollabConfig(style) != null
}

