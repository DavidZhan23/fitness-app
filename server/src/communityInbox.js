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
  dislikesOnMyCard: 0,
  commentsOnMyCard: 0,
  repliesToMe: 0,
  items: [],
})

function normalizePagination(limit, offset) {
  const safeLimit = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.trunc(limit)))
    : 20
  const safeOffset = Number.isFinite(offset)
    ? Math.max(0, Math.trunc(offset))
    : 0
  return { safeLimit, safeOffset }
}

async function loadInboxItems(userId, opts = {}) {
  const {
    since = null,
    limit = 20,
    offset = 0,
  } = opts
  const { safeLimit, safeOffset } = normalizePagination(limit, offset)

  const params = [userId]
  let sinceClauseLike = ''
  let sinceClauseComment = ''
  let sinceClauseReply = ''
  let sinceClauseDislike = ''
  if (since) {
    params.push(since)
    const p = `$${params.length}`
    sinceClauseLike = ` and dl.created_at > ${p}`
    sinceClauseDislike = ` and dd.created_at > ${p}`
    sinceClauseComment = ` and c.created_at > ${p}`
    sinceClauseReply = ` and c.created_at > ${p}`
  }
  params.push(safeLimit)
  const limitParam = `$${params.length}`
  params.push(safeOffset)
  const offsetParam = `$${params.length}`

  const { rows } = await query(
    `select * from (
       select 'like' as kind, dl.created_at, dl.like_date::text as log_date,
              dl.target_user_id, dl.liker_id as actor_id,
              null::text as body_preview, p.nickname as actor_nickname
       from day_likes dl
       join profiles p on p.id = dl.liker_id
       where dl.target_user_id = $1 and dl.liker_id <> $1${sinceClauseLike}
       union all
       select 'dislike' as kind, dd.created_at, dd.like_date::text as log_date,
              dd.target_user_id, dd.liker_id as actor_id,
              null::text as body_preview, p.nickname as actor_nickname
       from day_dislikes dd
       join profiles p on p.id = dd.liker_id
       where dd.target_user_id = $1 and dd.liker_id <> $1${sinceClauseDislike}
       union all
       select 'comment_on_card', c.created_at, c.log_date::text,
              c.target_user_id, c.author_id,
              left(trim(c.body), 72), p.nickname
       from day_comments c
       join profiles p on p.id = c.author_id
       where c.target_user_id = $1 and c.author_id <> $1
         and (c.reply_to_user_id is null or c.reply_to_user_id <> $1)${sinceClauseComment}
       union all
       select 'reply', c.created_at, c.log_date::text,
              c.target_user_id, c.author_id,
              left(trim(c.body), 72), p.nickname
       from day_comments c
       join profiles p on p.id = c.author_id
       where c.reply_to_user_id = $1 and c.author_id <> $1${sinceClauseReply}
     ) u
     order by created_at desc
     limit ${limitParam}
     offset ${offsetParam}`,
    params,
  )

  return rows.map((r) => ({
    kind: r.kind,
    actorNickname: publicNicknameById(r.actor_id, r.actor_nickname),
    logDate: r.log_date,
    targetUserId: r.target_user_id,
    bodyPreview: r.body_preview || null,
    createdAt: r.created_at,
  }))
}

async function loadInboxTotal(userId, since = null) {
  const params = [userId]
  let timeClause = ''
  if (since) {
    params.push(since)
    timeClause = ` and created_at > $2`
  }
  const { rows } = await query(
    `select (
       select count(*)::int from day_likes
       where target_user_id = $1 and liker_id <> $1${timeClause}
     ) + (
       select count(*)::int from day_dislikes
       where target_user_id = $1 and liker_id <> $1${timeClause}
     ) + (
       select count(*)::int from day_comments
       where target_user_id = $1 and author_id <> $1
         and (reply_to_user_id is null or reply_to_user_id <> $1)${timeClause}
     ) + (
       select count(*)::int from day_comments
       where reply_to_user_id = $1 and author_id <> $1${timeClause}
     ) as total`,
    params,
  )
  return rows[0]?.total ?? 0
}

export async function getCommunityInboxUnread(userId) {
  const { isFirstVisit, seenAt } = await resolveSeenAt(userId)
  if (isFirstVisit) return emptyInbox()

  const [likeCount, dislikeCount, commentCount, replyCount, items] = await Promise.all([
    query(
      `select count(*)::int as c from day_likes
       where target_user_id = $1 and liker_id <> $1 and created_at > $2`,
      [userId, seenAt],
    ),
    query(
      `select count(*)::int as c from day_dislikes
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
    loadInboxItems(userId, { since: seenAt, limit: 8, offset: 0 }),
  ])

  const likesOnMyCard = likeCount.rows[0]?.c ?? 0
  const dislikesOnMyCard = dislikeCount.rows[0]?.c ?? 0
  const commentsOnMyCard = commentCount.rows[0]?.c ?? 0
  const repliesToMe = replyCount.rows[0]?.c ?? 0
  const count = likesOnMyCard + dislikesOnMyCard + commentsOnMyCard + repliesToMe

  return {
    count: Math.max(0, count),
    likesOnMyCard,
    dislikesOnMyCard,
    commentsOnMyCard,
    repliesToMe,
    items,
  }
}

export async function listCommunityInbox(
  userId,
  opts = {},
) {
  const mode = opts.mode === 'history' ? 'history' : 'unread'
  const { safeLimit, safeOffset } = normalizePagination(
    opts.limit ?? 20,
    opts.offset ?? 0,
  )
  if (mode === 'history') {
    await resolveSeenAt(userId)
    const [total, items] = await Promise.all([
      loadInboxTotal(userId, null),
      loadInboxItems(userId, { limit: safeLimit, offset: safeOffset }),
    ])
    return {
      mode,
      total,
      hasMore: safeOffset + items.length < total,
      items,
    }
  }
  const { isFirstVisit, seenAt } = await resolveSeenAt(userId)
  if (isFirstVisit) {
    return {
      mode,
      total: 0,
      hasMore: false,
      items: [],
    }
  }
  const [total, items] = await Promise.all([
    loadInboxTotal(userId, seenAt),
    loadInboxItems(userId, { since: seenAt, limit: safeLimit, offset: safeOffset }),
  ])
  return {
    mode,
    total,
    hasMore: safeOffset + items.length < total,
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
