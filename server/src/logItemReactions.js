import { query } from './db.js'

function reactionToDb(reaction) {
  if (reaction === 'up') return 1
  if (reaction === 'down') return -1
  return null
}

function reactionFromDb(value) {
  if (value === 1) return 'up'
  if (value === -1) return 'down'
  return null
}

async function assertItemOwnedBy(ownerId, itemType, itemId) {
  const table = itemType === 'exercise' ? 'exercises' : 'meals'
  const { rows } = await query(
    `select e.id from ${table} e
     inner join day_logs d on d.id = e.day_log_id
     where e.id = $1 and d.user_id = $2`,
    [itemId, ownerId],
  )
  if (!rows[0]) {
    const err = new Error('记录不存在')
    err.status = 404
    throw err
  }
}

async function loadStatsForItems(viewerId, exercises, meals) {
  const items = [
    ...exercises.map((e) => ({ type: 'exercise', id: e.id })),
    ...meals.map((m) => ({ type: 'meal', id: m.id })),
  ]
  if (items.length === 0) {
    return { statsMap: new Map(), viewerMap: new Map() }
  }

  const types = items.map((i) => i.type)
  const ids = items.map((i) => i.id)

  const { rows: stats } = await query(
    `select item_type, item_id,
            count(*) filter (where reaction = 1)::int as thumbs_up,
            count(*) filter (where reaction = -1)::int as thumbs_down
     from log_item_reactions
     where item_type = any($1::text[]) and item_id = any($2::uuid[])
     group by item_type, item_id`,
    [types, ids],
  )

  const statsMap = new Map()
  for (const r of stats) {
    statsMap.set(`${r.item_type}:${r.item_id}`, {
      thumbsUp: r.thumbs_up,
      thumbsDown: r.thumbs_down,
    })
  }

  const { rows: viewerRows } = await query(
    `select item_type, item_id, reaction
     from log_item_reactions
     where voter_id = $1
       and item_type = any($2::text[])
       and item_id = any($3::uuid[])`,
    [viewerId, types, ids],
  )

  const viewerMap = new Map()
  for (const r of viewerRows) {
    viewerMap.set(`${r.item_type}:${r.item_id}`, reactionFromDb(r.reaction))
  }

  return { statsMap, viewerMap }
}

function attachReactions(list, itemType, statsMap, viewerMap) {
  return list.map((row) => {
    const key = `${itemType}:${row.id}`
    const s = statsMap.get(key) ?? { thumbsUp: 0, thumbsDown: 0 }
    return {
      ...row,
      thumbsUp: s.thumbsUp,
      thumbsDown: s.thumbsDown,
      viewerReaction: viewerMap.get(key) ?? null,
    }
  })
}

export async function enrichLogItemsWithReactions(
  viewerId,
  ownerId,
  exercises,
  meals,
) {
  const { statsMap, viewerMap } = await loadStatsForItems(
    viewerId,
    exercises,
    meals,
  )
  return {
    exercises: attachReactions(exercises, 'exercise', statsMap, viewerMap),
    meals: attachReactions(meals, 'meal', statsMap, viewerMap),
  }
}

async function getItemReactionStats(itemType, itemId, viewerId) {
  const { rows } = await query(
    `select
       count(*) filter (where reaction = 1)::int as thumbs_up,
       count(*) filter (where reaction = -1)::int as thumbs_down
     from log_item_reactions
     where item_type = $1 and item_id = $2`,
    [itemType, itemId],
  )
  const { rows: viewer } = await query(
    `select reaction from log_item_reactions
     where voter_id = $1 and item_type = $2 and item_id = $3`,
    [viewerId, itemType, itemId],
  )
  return {
    thumbsUp: rows[0]?.thumbs_up ?? 0,
    thumbsDown: rows[0]?.thumbs_down ?? 0,
    viewerReaction: viewer[0] ? reactionFromDb(viewer[0].reaction) : null,
  }
}

export async function setLogItemReaction(
  viewerId,
  ownerId,
  itemType,
  itemId,
  reaction,
) {
  if (viewerId === ownerId) {
    const err = new Error('不能对自己的记录表态')
    err.status = 400
    throw err
  }
  if (itemType !== 'exercise' && itemType !== 'meal') {
    const err = new Error('无效的记录类型')
    err.status = 400
    throw err
  }
  if (reaction !== null && reaction !== 'up' && reaction !== 'down') {
    const err = new Error('reaction 须为 up、down 或 null')
    err.status = 400
    throw err
  }

  await assertItemOwnedBy(ownerId, itemType, itemId)

  const next = reactionToDb(reaction)
  const { rows: current } = await query(
    `select reaction from log_item_reactions
     where voter_id = $1 and item_type = $2 and item_id = $3`,
    [viewerId, itemType, itemId],
  )
  const prev = current[0] ? current[0].reaction : null

  if (next === null || next === prev) {
    await query(
      `delete from log_item_reactions
       where voter_id = $1 and item_type = $2 and item_id = $3`,
      [viewerId, itemType, itemId],
    )
  } else {
    await query(
      `insert into log_item_reactions (voter_id, owner_user_id, item_type, item_id, reaction)
       values ($1, $2, $3, $4, $5)
       on conflict (voter_id, item_type, item_id)
       do update set reaction = excluded.reaction, created_at = now()`,
      [viewerId, ownerId, itemType, itemId, next],
    )
  }

  return getItemReactionStats(itemType, itemId, viewerId)
}
