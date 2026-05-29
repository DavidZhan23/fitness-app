import type { AppStyle } from '../context/StyleContext'

export type StyleToneGroup = 'light' | 'dark'

export interface StyleOption {
  id: AppStyle
  group: StyleToneGroup
  /** 主题主视觉色相（0–360），用于设置页组内色相环排序 */
  sortHue: number
  title: string
  description: string
  swatchClassName: string
  optionClassName: string
}

export const STYLE_TONE_SECTIONS: ReadonlyArray<{
  group: StyleToneGroup
  title: string
}> = [
  { group: 'light', title: '浅色系' },
  { group: 'dark', title: '深色系' },
]

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'wood-zen',
    group: 'light',
    sortHue: 32,
    title: '木隐茶庭',
    description: '米纸原木底、米杏卡，原木棕主操、苔绿缺口、茶青运动、柿橙饮食',
    swatchClassName: 'style-swatch-wood-zen',
    optionClassName: 'style-option-wood-zen',
  },
  {
    id: 'soy-tea',
    group: 'light',
    sortHue: 125,
    title: '豆乳清茶',
    description: '豆乳米杏底、奶绿卡，海盐蓝运动、茶绿缺口、豆乳焦糖饮食',
    swatchClassName: 'style-swatch-soy-tea',
    optionClassName: 'style-option-soy-tea',
  },
  {
    id: 'active-mint',
    group: 'light',
    sortHue: 158,
    title: '轻氧薄荷',
    description: '薄荷雾绿底、奶白薄荷卡，蓝管运动、珊瑚橙管饮食、绿管缺口',
    swatchClassName: 'style-swatch-active-mint',
    optionClassName: 'style-option-active-mint',
  },
  {
    id: 'sakura',
    group: 'light',
    sortHue: 208,
    title: '碧空樱缀',
    description: '浅蓝天底、云白蓝卡，亮蓝主操，甜樱粉点缀',
    swatchClassName: 'style-swatch-sakura',
    optionClassName: 'style-option-sakura',
  },
  {
    id: 'lavender',
    group: 'light',
    sortHue: 272,
    title: '薰衣云梦',
    description: '云雾淡紫底、奶白紫卡，薰衣草主操、紫蓝运动、玫瑰紫粉饮食',
    swatchClassName: 'style-swatch-lavender',
    optionClassName: 'style-option-lavender',
  },
  {
    id: 'sakura-blush',
    group: 'light',
    sortHue: 338,
    title: '樱雾漫境',
    description: '樱花粉底、奶粉卡，运动蓝 / 饮食莓粉',
    swatchClassName: 'style-swatch-sakura-blush',
    optionClassName: 'style-option-sakura-blush',
  },
  {
    id: 'eva-unit02',
    group: 'dark',
    sortHue: 8,
    title: '烈焰二号机',
    description: '深黑红驾驶舱 · 二号机红主操 · 橙黄饮食 · 荧光绿运动缺口',
    swatchClassName: 'style-swatch-eva-unit02',
    optionClassName: 'style-option-eva-unit02',
  },
  {
    id: 'default',
    group: 'dark',
    sortHue: 168,
    title: '深海能量',
    description: '偏运动感的深色青绿系',
    swatchClassName: 'style-swatch-ocean',
    optionClassName: 'style-option-ocean',
  },
  {
    id: 'gundam-hangar',
    group: 'dark',
    sortHue: 215,
    title: '格纳库提坦斯',
    description: '暗色提坦斯钢蓝格纳库、冷青运动缺口、暗红饮食与盈余，仪表盘感',
    swatchClassName: 'style-swatch-gundam-hangar',
    optionClassName: 'style-option-gundam-hangar',
  },
  {
    id: 'jojo-stardust-duel',
    group: 'dark',
    sortHue: 228,
    title: '时停入侵',
    description: '承太郎钴蓝主场 · DIO 金黄绿入侵 · 黑蓝热力图',
    swatchClassName: 'style-swatch-jojo-stardust-duel',
    optionClassName: 'style-option-jojo-stardust-duel',
  },
  {
    id: 'eva',
    group: 'dark',
    sortHue: 278,
    title: '暴走初号机',
    description: '深黑紫机甲底 · 荧光绿运动缺口 · 插入栓橙饮食',
    swatchClassName: 'style-swatch-eva',
    optionClassName: 'style-option-eva',
  },
]

export function styleOptionsForGroup(group: StyleToneGroup): StyleOption[] {
  return STYLE_OPTIONS.filter((option) => option.group === group).sort(
    (a, b) => a.sortHue - b.sortHue || a.title.localeCompare(b.title, 'zh-CN'),
  )
}

export function findStyleOption(id: AppStyle): StyleOption | undefined {
  return STYLE_OPTIONS.find((option) => option.id === id)
}
