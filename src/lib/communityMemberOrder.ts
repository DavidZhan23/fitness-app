/** 社区成员列表排序（自己固定首位） */

export function reorderCommunityMembers<T extends { id: string; isSelf: boolean }>(
  list: T[],
  activeId: string,
  overId: string,
): T[] {
  if (activeId === overId) return list
  const self = list.find((m) => m.isSelf)
  if (self && (activeId === self.id || overId === self.id)) return list

  const others = list.filter((m) => !m.isSelf)
  const from = others.findIndex((m) => m.id === activeId)
  const to = others.findIndex((m) => m.id === overId)
  if (from < 0 || to < 0) return list

  const nextOthers = [...others]
  const [item] = nextOthers.splice(from, 1)
  nextOthers.splice(to, 0, item)

  return self ? [self, ...nextOthers] : nextOthers
}

export function memberIdsForOrder(list: { id: string; isSelf: boolean }[]) {
  return list.filter((m) => !m.isSelf).map((m) => m.id)
}
