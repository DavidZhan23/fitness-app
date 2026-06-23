import type { FoxChatResponse } from './foxTypes'

export const foxLines = {
  enter: ['运动大王来了？小狸已经等你好久了。', '今日页面亮起来了，因为你来了。', '小狸闻到了自律的味道。'],
  encourage: ['再动一动嘛，就一点点。', '走十分钟也算数，小狸不挑，只要你开始。', '再给今天添一笔漂亮的运动记录吧。'],
  teasing: ['怎么停下来了？小狸的尾巴都等得无聊了。', '靠近目标一点点，也算靠近小狸一点点。', '今日的你要是再争气一点，会很好看。'],
  completed: ['漂亮。今日目标已经被你拿下了。', '小狸很满意，尾巴都替你骄傲起来了。', '你完成目标的样子，真让人移不开眼。'],
  lazy: ['今天安静得有点过分哦。', '不需要很厉害，先站起来就赢一半了。', '来嘛，十分钟，小狸陪你。'],
  caring: ['如果累了，就好好休息。强大不是硬撑出来的。', '小狸喜欢你努力，也希望你平安。', '运动是为了更喜欢自己，不是为了惩罚自己。'],
  praise: ['哼，还挺会努力的嘛。', '今日的你，有点让小狸移不开眼呢。', '这股自律劲儿，真漂亮。', '小狸看得出来，你不是随便说说的人。'],
  aiLoading: ['小狸正在想怎么夸你……', '她轻轻甩了甩尾巴……', '小狸看了看你的今日状态……', '狐火闪了一下，像是有话要说。'],
  aiError: ['小狸刚刚走神了一下。不过今日的你，还是值得被夸一句。', '狐火闪了一下，话没传过来，但小狸看见你的努力了。', '哼，刚才风太大了。那就让本狐亲自夸你一句吧。'],
} as const

export type FoxLineCategory = keyof typeof foxLines

export function getRandomFoxLine(category: FoxLineCategory): string {
  const lines = foxLines[category]
  return lines[Math.floor(Math.random() * lines.length)]
}

export function getLocalFoxResponse(category: FoxLineCategory): FoxChatResponse {
  const completed = category === 'completed'
  const caring = category === 'caring' || category === 'aiError'
  return {
    text: getRandomFoxLine(category),
    mood: completed ? 'celebrating' : caring ? 'caring' : category === 'teasing' ? 'teasing' : 'encouraging',
    motion: completed ? 'celebrate' : caring ? 'tail_sway' : category === 'praise' ? 'praise' : 'encourage',
    expression: completed ? 'proud' : caring ? 'caring' : category === 'teasing' ? 'teasing' : 'smile',
    bubbleStyle: completed ? 'gold' : caring ? 'soft' : 'warm',
    duration: completed ? 8 : 6,
    fallback: true,
  }
}

export function getProgressLineCategory(progress: number): FoxLineCategory {
  if (progress <= 0) return 'lazy'
  if (progress < 0.3) return 'encourage'
  if (progress < 0.7) return 'teasing'
  if (progress < 1) return 'praise'
  return 'completed'
}
