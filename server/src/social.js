import { query } from './db.js'
import { assertCanViewCommunity, loadProfile } from './community.js'

function publicNickname(profile) {
  const nick = profile?.nickname?.trim()
  if (nick) return nick.slice(0, 32)
  return `健身者${String(profile.id).slice(0, 6)}`
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

export async function listDayComments(targetUserId, logDate, viewerId) {
  await assertCanInteract(viewerId, targetUserId)
  const { rows } = await query(
    `select c.id, c.author_id, c.body, c.created_at, p.nickname
     from day_comments c
     join profiles p on p.id = c.author_id
     where c.target_user_id = $1 and c.log_date = $2::date
     order by c.created_at asc`,
    [targetUserId, logDate],
  )
  return rows.map((r) => ({
    id: r.id,
    authorId: r.author_id,
    authorNickname: publicNickname({ id: r.author_id, nickname: r.nickname }),
    body: r.body,
    createdAt: r.created_at,
    isOwn: r.author_id === viewerId,
  }))
}

export async function addDayComment(authorId, targetUserId, logDate, body) {
  const trimmed = String(body ?? '').trim()
  if (trimmed.length < 1 || trimmed.length > 280) {
    const err = new Error('评论长度为 1–280 字')
    err.status = 400
    throw err
  }
  await assertCanInteract(authorId, targetUserId)
  const { rows } = await query(
    `insert into day_comments (author_id, target_user_id, log_date, body)
     values ($1, $2, $3::date, $4)
     returning id, author_id, body, created_at`,
    [authorId, targetUserId, logDate, trimmed],
  )
  const profile = await loadProfile(authorId)
  const row = rows[0]
  return {
    id: row.id,
    authorId: row.author_id,
    authorNickname: publicNickname(profile),
    body: row.body,
    createdAt: row.created_at,
    isOwn: true,
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
