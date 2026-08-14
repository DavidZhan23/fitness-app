import type {
  Meal,
  MicronutrientId,
  MicronutrientItem,
  MicronutrientStatus,
  MicronutrientSummary,
} from '../types'

export const MICRONUTRIENT_CATALOG: {
  id: MicronutrientId
  label: string
  shortLabel: string
  group: '维生素' | '矿物质'
  role: string
  foods: string
}[] = [
  {
    id: 'vit_a', label: '维生素 A', shortLabel: '维 A', group: '维生素',
    role: '维生素 A 帮助维持正常视力，也参与皮肤和黏膜的日常更新。它还支持免疫系统正常工作，尤其适合从多样食物中稳定获得。',
    foods: '动物肝脏、鸡蛋和奶制品含有可直接利用的维生素 A。胡萝卜、南瓜、菠菜等橙黄色或深绿色蔬菜含有可在体内转化的胡萝卜素。',
  },
  {
    id: 'vit_c', label: '维生素 C', shortLabel: '维 C', group: '维生素',
    role: '维生素 C 参与胶原蛋白形成，帮助皮肤、牙龈和伤口的正常维护。它也有抗氧化作用，并能帮助身体吸收植物性食物中的铁。',
    foods: '甜椒、猕猴桃、橙子和草莓都是常见来源。西兰花、番茄和多种新鲜绿叶菜也能提供维生素 C，久煮可能会损失一部分。',
  },
  {
    id: 'vit_d', label: '维生素 D', shortLabel: '维 D', group: '维生素',
    role: '维生素 D 帮助钙和磷被身体利用，对骨骼和牙齿维护很重要。它也参与肌肉与免疫系统的正常工作。',
    foods: '三文鱼、沙丁鱼等富脂鱼，以及蛋黄，是较常见的天然来源。部分牛奶、植物奶或谷物会额外强化维生素 D，可查看包装标签。',
  },
  {
    id: 'vit_e', label: '维生素 E', shortLabel: '维 E', group: '维生素',
    role: '维生素 E 是脂溶性抗氧化营养素，帮助保护细胞膜免受氧化影响。它也支持免疫系统和皮肤的正常状态。',
    foods: '杏仁、葵花籽、花生和榛子含量较丰富。植物油、牛油果和部分深绿色蔬菜也能提供维生素 E。',
  },
  {
    id: 'vit_k', label: '维生素 K', shortLabel: '维 K', group: '维生素',
    role: '维生素 K 参与正常凝血过程，也帮助骨骼中的蛋白质发挥作用。日常均衡饮食通常能从蔬菜中持续获得。',
    foods: '菠菜、羽衣甘蓝、西兰花和卷心菜是常见来源。部分植物油和发酵豆制品也含有维生素 K。',
  },
  {
    id: 'vit_b1', label: '维生素 B1', shortLabel: '维 B1', group: '维生素',
    role: '维生素 B1 帮助身体把碳水化合物转成可用能量。它也参与神经和心脏的正常运作。',
    foods: '瘦猪肉、全谷物和强化谷物是常见来源。豆类、坚果和种子也能补充维生素 B1。',
  },
  {
    id: 'vit_b2', label: '维生素 B2', shortLabel: '维 B2', group: '维生素',
    role: '维生素 B2 参与能量代谢，帮助身体利用蛋白质、脂肪和碳水。它也支持皮肤、眼睛和红细胞的正常状态。',
    foods: '牛奶、酸奶、鸡蛋和瘦肉是日常来源。蘑菇、杏仁、深绿色蔬菜和强化谷物中也含有维生素 B2。',
  },
  {
    id: 'vit_b6', label: '维生素 B6', shortLabel: '维 B6', group: '维生素',
    role: '维生素 B6 参与蛋白质代谢，也帮助制造神经递质和血红蛋白。它对免疫与神经系统的正常工作都有支持作用。',
    foods: '鸡肉、鱼、土豆和香蕉是常见来源。鹰嘴豆、全谷物和部分坚果也含有维生素 B6。',
  },
  {
    id: 'vit_b9', label: '叶酸（B9）', shortLabel: '叶酸', group: '维生素',
    role: '叶酸参与 DNA 合成和新细胞形成，也帮助制造正常红细胞。生长较快的阶段对它的需求更受关注，但日常仍应以多样食物为基础。',
    foods: '菠菜等深绿色叶菜、豆类和芦笋是常见来源。牛油果、橙子以及强化谷物也能提供叶酸。',
  },
  {
    id: 'vit_b12', label: '维生素 B12', shortLabel: '维 B12', group: '维生素',
    role: '维生素 B12 参与红细胞形成和 DNA 合成。它也帮助神经系统维持正常功能。',
    foods: '鱼、贝类、肉、鸡蛋和奶制品是主要天然来源。以植物性饮食为主时，可留意标有强化维生素 B12 的食品。',
  },
  {
    id: 'calcium', label: '钙', shortLabel: '钙', group: '矿物质',
    role: '钙是骨骼和牙齿的重要组成，也参与肌肉收缩和神经信号传递。身体每天都会使用钙，因此稳定的食物来源比偶尔集中摄入更重要。',
    foods: '牛奶、酸奶、奶酪和用钙盐点制的豆腐是常见来源。带骨小鱼、芝麻酱和部分深绿色蔬菜也能提供钙。',
  },
  {
    id: 'iron', label: '铁', shortLabel: '铁', group: '矿物质',
    role: '铁是血红蛋白的重要组成，帮助红细胞把氧气送到身体各处。它也参与能量代谢和免疫系统的正常工作。',
    foods: '瘦红肉、动物肝脏和贝类中的铁较容易被利用。豆类、豆腐和深绿色叶菜也含铁，和富含维生素 C 的食物同吃有助吸收。',
  },
  {
    id: 'zinc', label: '锌', shortLabel: '锌', group: '矿物质',
    role: '锌参与免疫反应、细胞生长和伤口正常修复。它也与味觉和嗅觉的正常功能有关。',
    foods: '牡蛎等贝类、瘦肉和奶制品是常见来源。豆类、南瓜籽、坚果和全谷物也含有锌。',
  },
  {
    id: 'magnesium', label: '镁', shortLabel: '镁', group: '矿物质',
    role: '镁参与很多能量反应，也帮助肌肉、神经和心脏正常工作。它还是骨骼结构的一部分。',
    foods: '坚果、种子、全谷物和豆类含镁较多。菠菜等深绿色叶菜、牛油果和可可也能提供镁。',
  },
  {
    id: 'potassium', label: '钾', shortLabel: '钾', group: '矿物质',
    role: '钾帮助维持体液平衡，也参与神经信号和肌肉收缩。和整体饮食搭配时，它有助于维持正常血压。',
    foods: '土豆、豆类、香蕉和番茄是常见来源。深绿色蔬菜、酸奶、鱼和多种水果也含有钾。',
  },
  {
    id: 'iodine', label: '碘', shortLabel: '碘', group: '矿物质',
    role: '碘是制造甲状腺激素所需的营养素，影响能量代谢和生长发育。日常以稳定、不过量的食物来源为宜。',
    foods: '加碘盐是家庭饮食中最稳定的常见来源，海鱼、贝类、奶制品和鸡蛋也含碘。海带、紫菜等海藻含量差异很大，不必为了补碘集中大量食用。',
  },
]

export type MicronutrientFilter =
  | 'all'
  | 'low'
  | 'unknown'
  | 'adequate'
  | 'vitamins'
  | 'minerals'

export const MICRONUTRIENT_STATUS_LABELS: Record<MicronutrientStatus, string> = {
  adequate: '可能充足',
  low: '可能不足',
  unknown: '信息不足',
}

const STATUS_ORDER: Record<MicronutrientStatus, number> = {
  low: 0,
  unknown: 1,
  adequate: 2,
}

export function micronutrientItemsForDisplay(
  summary: MicronutrientSummary | null | undefined,
): MicronutrientItem[] {
  const existing = new Map(
    (summary?.items ?? []).map((item) => [item.id, item]),
  )
  return MICRONUTRIENT_CATALOG.map<MicronutrientItem>(({ id }) =>
    existing.get(id) ?? {
      id,
      status: 'unknown' as const,
      note: '',
      food_suggestions: [],
    },
  ).sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff
    return (
      MICRONUTRIENT_CATALOG.findIndex((item) => item.id === a.id) -
      MICRONUTRIENT_CATALOG.findIndex((item) => item.id === b.id)
    )
  })
}

export function micronutrientLabel(id: MicronutrientId): string {
  return MICRONUTRIENT_CATALOG.find((item) => item.id === id)?.label ?? id
}

export function micronutrientCatalogItem(id: MicronutrientId) {
  return MICRONUTRIENT_CATALOG.find((item) => item.id === id)
}

export function filterMicronutrientItems(
  items: MicronutrientItem[],
  filter: MicronutrientFilter,
): MicronutrientItem[] {
  if (filter === 'all') return items
  if (filter === 'low' || filter === 'unknown' || filter === 'adequate') {
    return items.filter((item) => item.status === filter)
  }
  const group = filter === 'vitamins' ? '维生素' : '矿物质'
  return items.filter(
    (item) => micronutrientCatalogItem(item.id)?.group === group,
  )
}

export type MealMicronutrientRowStatus = 'ready' | 'pending' | 'error'

export function mealHasMicronutrientEstimate(meal: Pick<Meal, 'micronutrients'>): boolean {
  return Array.isArray(meal.micronutrients?.items) && meal.micronutrients.items.length > 0
}

export function mealMicronutrientRowStatus(
  meal: Pick<Meal, 'micronutrients' | 'macros_status'>,
  dayStatus: string | null | undefined,
): MealMicronutrientRowStatus {
  if (mealHasMicronutrientEstimate(meal)) return 'ready'
  if (dayStatus === 'pending' || meal.macros_status === 'pending') return 'pending'
  return 'error'
}
