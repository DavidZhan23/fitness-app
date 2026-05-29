import { query } from './db.js'

export async function loadMemberOrderMap(viewerId) {
  const { rows } = await query(
    `select member_id, sort_index from community_member_order
     where viewer_id = $1 order by sort_index`,
    [viewerId],
  )
  return new Map(rows.map((r) => [r.member_id, r.sort_index]))
}

export function sortMembersByCustomOrder(members, orderMap) {
  const self = members.find((m) => m.isSelf)
  const others = members.filter((m) => !m.isSelf)

  others.sort((a, b) => {
    const ai = orderMap.get(a.id)
    const bi = orderMap.get(b.id)
    if (ai != null && bi != null) return ai - bi
    if (ai != null) return -1
    if (bi != null) return 1
    const nameCmp = a.nickname.localeCompare(b.nickname, 'zh-CN')
    if (nameCmp !== 0) return nameCmp
    return a.id.localeCompare(b.id)
  })

  return self ? [self, ...others] : others
}

export async function saveCommunityMemberOrder(viewerId, memberIds) {
  if (!Array.isArray(memberIds)) {
    const err = new Error('请提供 memberIds 数组')
    err.status = 400
    throw err
  }

  const unique = []
  const seen = new Set()
  for (const raw of memberIds) {
    const id = String(raw)
    if (!id || id === viewerId || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }

  await query(`delete from community_member_order where viewer_id = $1`, [
    viewerId,
  ])

  for (let i = 0; i < unique.length; i++) {
    await query(
      `insert into community_member_order (viewer_id, member_id, sort_index)
       values ($1, $2, $3)`,
      [viewerId, unique[i], i],
    )
  }

  return { ok: true, count: unique.length }
}
