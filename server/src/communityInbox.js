import { query } from './db.js'

export async function getCommunityInboxUnread(userId) {
  const { rows } = await query(
    `select community_notify_seen_at from profiles where id = $1`,
    [userId],
  )
  if (!rows[0]?.community_notify_seen_at) {
    await query(
      `update profiles set community_notify_seen_at = now()
       where id = $1 and community_notify_seen_at is null`,
      [userId],
    )
    return { count: 0 }
  }
  const seenAt = rows[0].community_notify_seen_at

  const { rows: countRows } = await query(
    `select count(*)::int as c from (
       select id from day_likes
       where target_user_id = $1
         and liker_id <> $1
         and created_at > $2
       union all
       select id from day_comments
       where target_user_id = $1
         and author_id <> $1
         and created_at > $2
     ) t`,
    [userId, seenAt],
  )

  const count = countRows[0]?.c ?? 0
  return { count: Math.max(0, count) }
}

export async function markCommunityInboxRead(userId) {
  await query(
    `update profiles set community_notify_seen_at = now() where id = $1`,
    [userId],
  )
  return { ok: true, count: 0 }
}
