import { query } from './db.js'
import { publicNicknameById } from './publicProfile.js'

async function resolveSeenAt(userId) {
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
    return { isFirstVisit: true, seenAt: null }
  }
  return { isFirstVisit: false, seenAt: rows[0].community_notify_seen_at }
}

const emptyInbox = () => ({
  count: 0,
  likesOnMyCard: 0,
  commentsOnMyCard: 0,
  repliesToMe: 0,
  items: [],
})

export async function getCommunityInboxUnread(userId) {
  const { isFirstVisit, seenAt } = await resolveSeenAt(userId)
  if (isFirstVisit) return emptyInbox()

  const [likeCount, commentCount, replyCount, itemRows] = await Promise.all([
    query(
      `select count(*)::int as c from day_likes
       where target_user_id = $1 and liker_id <> $1 and created_at > $2`,
      [userId, seenAt],
    ),
    query(
      `select count(*)::int as c from day_comments
       where target_user_id = $1 and author_id <> $1 and created_at > $2
         and (reply_to_user_id is null or reply_to_user_id <> $1)`,
      [userId, seenAt],
    ),
    query(
      `select count(*)::int as c from day_comments
       where reply_to_user_id = $1 and author_id <> $1 and created_at > $2`,
      [userId, seenAt],
    ),
    query(
      `select * from (
         select 'like' as kind, dl.created_at, dl.like_date::text as log_date,
                dl.target_user_id, dl.liker_id as actor_id,
                null::text as body_preview, p.nickname as actor_nickname
         from day_likes dl
         join profiles p on p.id = dl.liker_id
         where dl.target_user_id = $1 and dl.liker_id <> $1 and dl.created_at > $2
         union all
         select 'comment_on_card', c.created_at, c.log_date::text,
                c.target_user_id, c.author_id,
                left(trim(c.body), 72), p.nickname
         from day_comments c
         join profiles p on p.id = c.author_id
         where c.target_user_id = $1 and c.author_id <> $1 and c.created_at > $2
           and (c.reply_to_user_id is null or c.reply_to_user_id <> $1)
         union all
         select 'reply', c.created_at, c.log_date::text,
                c.target_user_id, c.author_id,
                left(trim(c.body), 72), p.nickname
         from day_comments c
         join profiles p on p.id = c.author_id
         where c.reply_to_user_id = $1 and c.author_id <> $1 and c.created_at > $2
       ) u
       order by created_at desc
       limit 8`,
      [userId, seenAt],
    ),
  ])

  const likesOnMyCard = likeCount.rows[0]?.c ?? 0
  const commentsOnMyCard = commentCount.rows[0]?.c ?? 0
  const repliesToMe = replyCount.rows[0]?.c ?? 0
  const count = likesOnMyCard + commentsOnMyCard + repliesToMe

  const items = itemRows.rows.map((r) => ({
    kind: r.kind,
    actorNickname: publicNicknameById(r.actor_id, r.actor_nickname),
    logDate: r.log_date,
    targetUserId: r.target_user_id,
    bodyPreview: r.body_preview || null,
    createdAt: r.created_at,
  }))

  return {
    count: Math.max(0, count),
    likesOnMyCard,
    commentsOnMyCard,
    repliesToMe,
    items,
  }
}

export async function markCommunityInboxRead(userId) {
  await query(
    `update profiles set community_notify_seen_at = now() where id = $1`,
    [userId],
  )
  return { ok: true, count: 0 }
}
