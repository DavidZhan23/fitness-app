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
  interactionCount: 0,
  followersOnMe: 0,
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

function mapInboxRow(r) {
  const base = {
    id: r.inbox_id,
    kind: r.kind,
    actorId: r.actor_id,
    actorNickname: publicNicknameById(r.actor_id, r.actor_nickname),
    actorAvatarUrl: r.actor_avatar_url ?? null,
    logDate: r.log_date,
    targetUserId: r.target_user_id,
    bodyPreview: r.body_preview || null,
    createdAt: r.created_at,
  }
  if (r.kind === 'follow') {
    return {
      ...base,
      viewerFollowsActor: Boolean(r.viewer_follows_actor),
      actorCanViewProfile: Boolean(r.actor_can_view_profile),
    }
  }
  return base
}

function buildSinceClauses(since, params) {
  if (!since) {
    return {
      sinceClauseLike: '',
      sinceClauseDislike: '',
      sinceClauseComment: '',
      sinceClauseReply: '',
      sinceClauseCommentLike: '',
      sinceClauseCommentDislike: '',
      sinceClauseFollow: '',
    }
  }
  params.push(since)
  const p = `$${params.length}`
  return {
    sinceClauseLike: ` and dl.created_at > ${p}`,
    sinceClauseDislike: ` and dd.created_at > ${p}`,
    sinceClauseComment: ` and c.created_at > ${p}`,
    sinceClauseReply: ` and c.created_at > ${p}`,
    sinceClauseCommentLike: ` and l.created_at > ${p}`,
    sinceClauseCommentDislike: ` and d.created_at > ${p}`,
    sinceClauseFollow: ` and f.created_at > ${p}`,
  }
}

async function loadInboxItems(userId, opts = {}) {
  const {
    since = null,
    limit = 20,
    offset = 0,
  } = opts
  const { safeLimit, safeOffset } = normalizePagination(limit, offset)

  const params = [userId]
  const {
    sinceClauseLike,
    sinceClauseDislike,
    sinceClauseComment,
    sinceClauseReply,
    sinceClauseCommentLike,
    sinceClauseCommentDislike,
    sinceClauseFollow,
  } = buildSinceClauses(since, params)

  params.push(safeLimit)
  const limitParam = `$${params.length}`
  params.push(safeOffset)
  const offsetParam = `$${params.length}`

  const { rows } = await query(
    `select * from (
       select 'like' as kind,
              ('like:' || dl.liker_id::text || ':' || dl.target_user_id::text || ':' || dl.like_date::text) as inbox_id,
              dl.created_at, dl.like_date::text as log_date,
              dl.target_user_id, dl.liker_id as actor_id,
              null::text as body_preview, p.nickname as actor_nickname,
              p.avatar_url as actor_avatar_url,
              null::boolean as viewer_follows_actor,
              null::boolean as actor_can_view_profile
       from day_likes dl
       join profiles p on p.id = dl.liker_id
       where dl.target_user_id = $1 and dl.liker_id <> $1${sinceClauseLike}
       union all
       select 'dislike' as kind,
              ('dislike:' || dd.liker_id::text || ':' || dd.target_user_id::text || ':' || dd.like_date::text) as inbox_id,
              dd.created_at, dd.like_date::text as log_date,
              dd.target_user_id, dd.liker_id as actor_id,
              null::text as body_preview, p.nickname as actor_nickname,
              p.avatar_url as actor_avatar_url,
              null::boolean as viewer_follows_actor,
              null::boolean as actor_can_view_profile
       from day_dislikes dd
       join profiles p on p.id = dd.liker_id
       where dd.target_user_id = $1 and dd.liker_id <> $1${sinceClauseDislike}
       union all
       select 'comment_on_card' as kind,
              ('comment:' || c.id::text) as inbox_id,
              c.created_at, c.log_date::text,
              c.target_user_id, c.author_id as actor_id,
              left(trim(c.body), 72) as body_preview, p.nickname as actor_nickname,
              p.avatar_url as actor_avatar_url,
              null::boolean as viewer_follows_actor,
              null::boolean as actor_can_view_profile
       from day_comments c
       join profiles p on p.id = c.author_id
       where c.target_user_id = $1 and c.author_id <> $1
         and (c.reply_to_user_id is null or c.reply_to_user_id <> $1)${sinceClauseComment}
       union all
       select 'reply' as kind,
              ('reply:' || c.id::text) as inbox_id,
              c.created_at, c.log_date::text,
              c.target_user_id, c.author_id as actor_id,
              left(trim(c.body), 72) as body_preview, p.nickname as actor_nickname,
              p.avatar_url as actor_avatar_url,
              null::boolean as viewer_follows_actor,
              null::boolean as actor_can_view_profile
       from day_comments c
       join profiles p on p.id = c.author_id
       where c.reply_to_user_id = $1 and c.author_id <> $1${sinceClauseReply}
       union all
       select 'comment_like' as kind,
              ('comment_like:' || l.comment_id::text || ':' || l.liker_id::text) as inbox_id,
              l.created_at, c.log_date::text,
              c.target_user_id, l.liker_id as actor_id,
              left(trim(c.body), 72) as body_preview, p.nickname as actor_nickname,
              p.avatar_url as actor_avatar_url,
              null::boolean as viewer_follows_actor,
              null::boolean as actor_can_view_profile
       from day_comment_likes l
       join day_comments c on c.id = l.comment_id
       join profiles p on p.id = l.liker_id
       where c.author_id = $1 and l.liker_id <> $1${sinceClauseCommentLike}
       union all
       select 'comment_dislike' as kind,
              ('comment_dislike:' || d.comment_id::text || ':' || d.disliker_id::text) as inbox_id,
              d.created_at, c.log_date::text,
              c.target_user_id, d.disliker_id as actor_id,
              left(trim(c.body), 72) as body_preview, p.nickname as actor_nickname,
              p.avatar_url as actor_avatar_url,
              null::boolean as viewer_follows_actor,
              null::boolean as actor_can_view_profile
       from day_comment_dislikes d
       join day_comments c on c.id = d.comment_id
       join profiles p on p.id = d.disliker_id
       where c.author_id = $1 and d.disliker_id <> $1${sinceClauseCommentDislike}
       union all
       select 'follow' as kind,
              ('follow:' || f.follower_id::text || ':' || f.followee_id::text || ':' || f.created_at::text) as inbox_id,
              f.created_at, f.created_at::date::text as log_date,
              f.followee_id as target_user_id, f.follower_id as actor_id,
              null::text as body_preview, p.nickname as actor_nickname,
              p.avatar_url as actor_avatar_url,
              exists(
                select 1 from follows f2
                where f2.follower_id = $1 and f2.followee_id = f.follower_id
              ) as viewer_follows_actor,
              (p.community_visible and p.onboarding_complete) as actor_can_view_profile
       from follows f
       join profiles p on p.id = f.follower_id
       where f.followee_id = $1 and f.follower_id <> $1${sinceClauseFollow}
     ) u
     order by created_at desc
     limit ${limitParam}
     offset ${offsetParam}`,
    params,
  )

  return rows.map(mapInboxRow)
}

async function loadInboxTotal(userId, since = null) {
  const params = [userId]
  let likeSince = ''
  let dislikeSince = ''
  let commentSince = ''
  let replySince = ''
  let commentLikeSince = ''
  let commentDislikeSince = ''
  let followSince = ''
  if (since) {
    params.push(since)
    const p = `$${params.length}`
    likeSince = ` and created_at > ${p}`
    dislikeSince = ` and created_at > ${p}`
    commentSince = ` and created_at > ${p}`
    replySince = ` and created_at > ${p}`
    commentLikeSince = ` and l.created_at > ${p}`
    commentDislikeSince = ` and d.created_at > ${p}`
    followSince = ` and f.created_at > ${p}`
  }
  const { rows } = await query(
    `select (
       select count(*)::int from day_likes
       where target_user_id = $1 and liker_id <> $1${likeSince}
     ) + (
       select count(*)::int from day_dislikes
       where target_user_id = $1 and liker_id <> $1${dislikeSince}
     ) + (
       select count(*)::int from day_comments
       where target_user_id = $1 and author_id <> $1
         and (reply_to_user_id is null or reply_to_user_id <> $1)${commentSince}
     ) + (
       select count(*)::int from day_comments
       where reply_to_user_id = $1 and author_id <> $1${replySince}
     ) + (
       select count(*)::int from day_comment_likes l
       join day_comments c on c.id = l.comment_id
       where c.author_id = $1 and l.liker_id <> $1${commentLikeSince}
     ) + (
       select count(*)::int from day_comment_dislikes d
       join day_comments c on c.id = d.comment_id
       where c.author_id = $1 and d.disliker_id <> $1${commentDislikeSince}
     ) + (
       select count(*)::int from follows f
       where f.followee_id = $1 and f.follower_id <> $1${followSince}
     ) as total`,
    params,
  )
  return rows[0]?.total ?? 0
}

export async function getCommunityInboxUnread(userId) {
  const { isFirstVisit, seenAt } = await resolveSeenAt(userId)
  if (isFirstVisit) return emptyInbox()

  const [
    likeCount,
    dislikeCount,
    commentCount,
    replyCount,
    commentLikeCount,
    commentDislikeCount,
    followCount,
    items,
  ] = await Promise.all([
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
      query(
        `select count(*)::int as c from day_comment_likes l
         join day_comments c on c.id = l.comment_id
         where c.author_id = $1 and l.liker_id <> $1 and l.created_at > $2`,
        [userId, seenAt],
      ),
      query(
        `select count(*)::int as c from day_comment_dislikes d
         join day_comments c on c.id = d.comment_id
         where c.author_id = $1 and d.disliker_id <> $1 and d.created_at > $2`,
        [userId, seenAt],
      ),
      query(
        `select count(*)::int as c from follows
         where followee_id = $1 and follower_id <> $1 and created_at > $2`,
        [userId, seenAt],
      ),
      loadInboxItems(userId, { since: seenAt, limit: 8, offset: 0 }),
    ])

  const likesOnMyCard = likeCount.rows[0]?.c ?? 0
  const dislikesOnMyCard = dislikeCount.rows[0]?.c ?? 0
  const commentsOnMyCard = commentCount.rows[0]?.c ?? 0
  const repliesToMe = replyCount.rows[0]?.c ?? 0
  const commentsLikedOnMe = commentLikeCount.rows[0]?.c ?? 0
  const commentsDislikedOnMe = commentDislikeCount.rows[0]?.c ?? 0
  const followersOnMe = followCount.rows[0]?.c ?? 0
  const interactionCount =
    likesOnMyCard +
    dislikesOnMyCard +
    commentsOnMyCard +
    repliesToMe +
    commentsLikedOnMe +
    commentsDislikedOnMe
  const count = interactionCount + followersOnMe

  return {
    count: Math.max(0, count),
    interactionCount: Math.max(0, interactionCount),
    followersOnMe: Math.max(0, followersOnMe),
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

export { loadInboxItems, mapInboxRow, emptyInbox }
