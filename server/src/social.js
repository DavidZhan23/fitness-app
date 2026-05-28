import { query } from './db.js'
import { assertCanViewCommunity, loadProfile } from './community.js'
import { publicNickname } from './publicProfile.js'

let ensureCommentLikeSchemaPromise = null

function ensureCommentLikeSchema() {
  if (!ensureCommentLikeSchemaPromise) {
    ensureCommentLikeSchemaPromise = (async () => {
      await query(
        `create table if not exists public.day_comment_likes (
          comment_id uuid not null references public.day_comments (id) on delete cascade,
          liker_id uuid not null references public.users (id) on delete cascade,
          created_at timestamptz not null default now(),
          primary key (comment_id, liker_id)
        )`,
      )
      await query(
        `create index if not exists idx_day_comment_likes_liker
         on public.day_comment_likes (liker_id, created_at)`,
      )
    })().catch((err) => {
      // Reset so subsequent requests can retry if startup race/DB transient error occurs.
      ensureCommentLikeSchemaPromise = null
      throw err
    })
  }
  return ensureCommentLikeSchemaPromise
}

export async function assertCanInteract(viewerId, targetUserId) {
  if (viewerId === targetUserId) return loadProfile(targetUserId)
  const profile = await loadProfile(targetUserId)
  assertCanViewCommunity(profile, viewerId)
  return profile
}

export async function followUser(followerId, followeeId) {
  if (followerId === followeeId) {
    const err = new Error('不能关注自己')
    err.status = 400
    throw err
  }
  await assertCanInteract(followerId, followeeId)
  await query(
    `insert into follows (follower_id, followee_id) values ($1, $2)
     on conflict do nothing`,
    [followerId, followeeId],
  )
  return { following: true }
}

export async function unfollowUser(followerId, followeeId) {
  await query(
    `delete from follows where follower_id = $1 and followee_id = $2`,
    [followerId, followeeId],
  )
  return { following: false }
}

export async function likeDay(likerId, targetUserId, likeDate) {
  if (likerId === targetUserId) {
    const err = new Error('不能给自己的打卡点赞')
    err.status = 400
    throw err
  }
  await assertCanInteract(likerId, targetUserId)
  await query(
    `insert into day_likes (liker_id, target_user_id, like_date)
     values ($1, $2, $3::date)
     on conflict (liker_id, target_user_id, like_date) do nothing`,
    [likerId, targetUserId, likeDate],
  )
  return getDayLikeStats(targetUserId, likeDate, likerId)
}

export async function unlikeDay(likerId, targetUserId, likeDate) {
  await assertCanInteract(likerId, targetUserId)
  await query(
    `delete from day_likes
     where liker_id = $1 and target_user_id = $2 and like_date = $3::date`,
    [likerId, targetUserId, likeDate],
  )
  return getDayLikeStats(targetUserId, likeDate, likerId)
}

export async function getDayLikeStats(targetUserId, likeDate, viewerId) {
  const [counts, viewer] = await Promise.all([
    query(
      `select count(*)::int as c from day_likes
       where target_user_id = $1 and like_date = $2::date`,
      [targetUserId, likeDate],
    ),
    viewerId
      ? query(
          `select 1 from day_likes
           where liker_id = $1 and target_user_id = $2 and like_date = $3::date`,
          [viewerId, targetUserId, likeDate],
        )
      : Promise.resolve({ rows: [] }),
  ])
  return {
    likeCount: counts.rows[0]?.c ?? 0,
    viewerLiked: viewer.rows.length > 0,
  }
}

export async function getFollowingIds(viewerId) {
  const { rows } = await query(
    `select followee_id from follows where follower_id = $1`,
    [viewerId],
  )
  return new Set(rows.map((r) => r.followee_id))
}

export async function enrichMembersSocial(members, viewerId, likeDate) {
  if (members.length === 0) return members

  const targetIds = members.map((m) => m.id)
  const [followRows, likeCountRows, viewerLikeRows] = await Promise.all([
    query(`select followee_id from follows where follower_id = $1`, [viewerId]),
    query(
      `select target_user_id, count(*)::int as c
       from day_likes
       where like_date = $1::date and target_user_id = any($2::uuid[])
       group by target_user_id`,
      [likeDate, targetIds],
    ),
    query(
      `select target_user_id from day_likes
       where liker_id = $1 and like_date = $2::date and target_user_id = any($3::uuid[])`,
      [viewerId, likeDate, targetIds],
    ),
  ])

  const followingSet = new Set(followRows.rows.map((r) => r.followee_id))
  const likeCountMap = new Map(
    likeCountRows.rows.map((r) => [r.target_user_id, r.c]),
  )
  const viewerLikedSet = new Set(
    viewerLikeRows.rows.map((r) => r.target_user_id),
  )

  return members.map((m) => ({
    ...m,
    isFollowing: followingSet.has(m.id),
    todayLikeCount: likeCountMap.get(m.id) ?? 0,
    viewerLikedToday: viewerLikedSet.has(m.id),
  }))
}

export async function isFollowing(viewerId, targetUserId) {
  const { rows } = await query(
    `select 1 from follows where follower_id = $1 and followee_id = $2`,
    [viewerId, targetUserId],
  )
  return rows.length > 0
}

function mapDayCommentRow(r, viewerId) {
  return {
    id: r.id,
    authorId: r.author_id,
    authorNickname: publicNickname({
      id: r.author_id,
      nickname: r.author_nickname,
    }),
    authorAvatarUrl: r.author_avatar_url ?? null,
    body: r.body,
    createdAt: r.created_at,
    isOwn: r.author_id === viewerId,
    parentCommentId: r.parent_comment_id ?? null,
    replyToUserId: r.reply_to_user_id ?? null,
    replyToNickname: r.reply_to_user_id
      ? publicNickname({
          id: r.reply_to_user_id,
          nickname: r.reply_to_nickname,
        })
      : null,
    likeCount: Number(r.like_count ?? 0),
    viewerLiked: Boolean(r.viewer_liked),
  }
}

async function getCommentById(commentId) {
  const { rows } = await query(
    `select id, author_id, target_user_id, log_date::text as log_date
     from day_comments where id = $1`,
    [commentId],
  )
  const comment = rows[0]
  if (!comment) {
    const err = new Error('评论不存在')
    err.status = 404
    throw err
  }
  return comment
}

export async function getDayCommentLikeStats(commentId, viewerId) {
  await ensureCommentLikeSchema()
  const [counts, viewer] = await Promise.all([
    query(
      `select count(*)::int as c from day_comment_likes
       where comment_id = $1`,
      [commentId],
    ),
    viewerId
      ? query(
          `select 1 from day_comment_likes
           where comment_id = $1 and liker_id = $2`,
          [commentId, viewerId],
        )
      : Promise.resolve({ rows: [] }),
  ])
  return {
    likeCount: counts.rows[0]?.c ?? 0,
    viewerLiked: viewer.rows.length > 0,
  }
}

async function loadParentForReply(parentCommentId, targetUserId, logDate) {
  const { rows } = await query(
    `select id, author_id, parent_comment_id, target_user_id, log_date::text as log_date
     from day_comments where id = $1`,
    [parentCommentId],
  )
  const parent = rows[0]
  if (!parent) {
    const err = new Error('原评论不存在')
    err.status = 404
    throw err
  }
  if (
    parent.target_user_id !== targetUserId ||
    parent.log_date !== logDate
  ) {
    const err = new Error('无法在该打卡下回复此评论')
    err.status = 400
    throw err
  }
  const threadRootId = parent.parent_comment_id ?? parent.id
  return {
    threadRootId,
    replyToUserId: parent.author_id,
  }
}

export async function listDayComments(targetUserId, logDate, viewerId) {
  await ensureCommentLikeSchema()
  await assertCanInteract(viewerId, targetUserId)
  const { rows } = await query(
    `with comment_rows as (
       select c.id, c.author_id, c.body, c.created_at, c.parent_comment_id, c.reply_to_user_id,
              p.nickname as author_nickname, p.avatar_url as author_avatar_url,
              rp.nickname as reply_to_nickname,
              coalesce(pc.created_at, c.created_at) as root_created_at
       from day_comments c
       join profiles p on p.id = c.author_id
       left join profiles rp on rp.id = c.reply_to_user_id
       left join day_comments pc on pc.id = c.parent_comment_id
       where c.target_user_id = $1 and c.log_date = $2::date
     ),
     like_stats as (
       select l.comment_id, count(*)::int as like_count
       from day_comment_likes l
       join comment_rows cr on cr.id = l.comment_id
       group by l.comment_id
     ),
     viewer_like as (
       select l.comment_id
       from day_comment_likes l
       join comment_rows cr on cr.id = l.comment_id
       where l.liker_id = $3
     )
     select cr.*,
            coalesce(ls.like_count, 0) as like_count,
            (vl.comment_id is not null) as viewer_liked
     from comment_rows cr
     left join like_stats ls on ls.comment_id = cr.id
     left join viewer_like vl on vl.comment_id = cr.id
     order by cr.root_created_at asc,
              case when cr.parent_comment_id is null then 0 else 1 end,
              cr.created_at asc,
              cr.id asc`,
    [targetUserId, logDate, viewerId],
  )
  return rows.map((r) => mapDayCommentRow(r, viewerId))
}

export async function addDayComment(
  authorId,
  targetUserId,
  logDate,
  body,
  parentCommentId = null,
) {
  const trimmed = String(body ?? '').trim()
  if (trimmed.length < 1 || trimmed.length > 280) {
    const err = new Error('评论长度为 1–280 字')
    err.status = 400
    throw err
  }
  await assertCanInteract(authorId, targetUserId)

  let threadRootId = null
  let replyToUserId = null
  if (parentCommentId) {
    const parent = await loadParentForReply(
      parentCommentId,
      targetUserId,
      logDate,
    )
    threadRootId = parent.threadRootId
    replyToUserId = parent.replyToUserId
  }

  const { rows } = await query(
    `insert into day_comments (
       author_id, target_user_id, log_date, body, parent_comment_id, reply_to_user_id
     )
     values ($1, $2, $3::date, $4, $5, $6)
     returning id, author_id, body, created_at, parent_comment_id, reply_to_user_id`,
    [
      authorId,
      targetUserId,
      logDate,
      trimmed,
      threadRootId,
      replyToUserId,
    ],
  )
  const profile = await loadProfile(authorId)
  let replyToNickname = null
  if (replyToUserId) {
    const replyProfile = await loadProfile(replyToUserId)
    replyToNickname = publicNickname(replyProfile)
  }
  const row = rows[0]
  return {
    id: row.id,
    authorId: row.author_id,
    authorNickname: publicNickname(profile),
    authorAvatarUrl: profile.avatar_url ?? null,
    body: row.body,
    createdAt: row.created_at,
    isOwn: true,
    likeCount: 0,
    viewerLiked: false,
    parentCommentId: row.parent_comment_id ?? null,
    replyToUserId: row.reply_to_user_id ?? null,
    replyToNickname,
  }
}

export async function deleteDayComment(viewerId, commentId) {
  const { rows } = await query(
    `delete from day_comments where id = $1 and author_id = $2 returning id`,
    [commentId, viewerId],
  )
  if (!rows[0]) {
    const err = new Error('评论不存在或无权删除')
    err.status = 404
    throw err
  }
  return { ok: true }
}

export async function likeDayComment(viewerId, commentId) {
  await ensureCommentLikeSchema()
  const comment = await getCommentById(commentId)
  await assertCanInteract(viewerId, comment.target_user_id)
  await query(
    `insert into day_comment_likes (comment_id, liker_id)
     values ($1, $2)
     on conflict do nothing`,
    [commentId, viewerId],
  )
  return getDayCommentLikeStats(commentId, viewerId)
}

export async function unlikeDayComment(viewerId, commentId) {
  await ensureCommentLikeSchema()
  const comment = await getCommentById(commentId)
  await assertCanInteract(viewerId, comment.target_user_id)
  await query(
    `delete from day_comment_likes
     where comment_id = $1 and liker_id = $2`,
    [commentId, viewerId],
  )
  return getDayCommentLikeStats(commentId, viewerId)
}
