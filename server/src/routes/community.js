import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import {
  getCommunityUser,
  getCommunityUserMonth,
  listCommunityMembers,
  setDayLogCommunityVisible,
} from '../community.js'
import { isValidDateKey } from '../dateKey.js'
import { saveCommunityMemberOrder } from '../communityOrder.js'
import { setLogItemReaction } from '../logItemReactions.js'
import {
  addDayComment,
  dislikeDay,
  deleteDayComment,
  dislikeDayComment,
  enrichMembersSocial,
  followUser,
  getDayLikeStats,
  isFollowing,
  listCommunityFollowers,
  likeDayComment,
  likeDay,
  listDayComments,
  unfollowUser,
  unlikeDayComment,
  unlikeDay,
  undislikeDayComment,
  undislikeDay,
} from '../social.js'
import {
  getCommunityInboxUnread,
  listCommunityInbox,
  markCommunityInboxRead,
} from '../communityInbox.js'

const router = Router()

router.get(
  '/community/inbox/unread',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await getCommunityInboxUnread(req.userId)
    res.json(data)
  }),
)

router.get(
  '/community/inbox',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const mode = req.query.mode === 'history' ? 'history' : 'unread'
    const limit = Number(req.query.limit)
    const offset = Number(req.query.offset)
    const data = await listCommunityInbox(req.userId, { mode, limit, offset })
    res.json(data)
  }),
)

router.post(
  '/community/inbox/mark-read',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await markCommunityInboxRead(req.userId)
    res.json(data)
  }),
)

router.get(
  '/community/followers',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await listCommunityFollowers(req.userId)
    res.json(data)
  }),
)

router.get(
  '/community/members',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const clientToday =
      typeof req.query.today === 'string' ? req.query.today : undefined
    const filter =
      req.query.filter === 'following' ? 'following' : 'all'
    const data = await listCommunityMembers(req.userId, clientToday, filter)
    data.members = await enrichMembersSocial(
      data.members,
      req.userId,
      data.today,
    )
    res.json(data)
  }),
)

router.put(
  '/community/member-order',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { memberIds } = req.body
    const data = await saveCommunityMemberOrder(req.userId, memberIds)
    res.json(data)
  }),
)

router.patch(
  '/community/days/:date/visible',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date } = req.params
    if (!isValidDateKey(date)) {
      return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' })
    }
    if (typeof req.body?.visible !== 'boolean') {
      return res.status(400).json({ error: 'visible 须为 boolean' })
    }
    const data = await setDayLogCommunityVisible(
      req.userId,
      date,
      req.body.visible,
    )
    res.json(data)
  }),
)

router.get(
  '/community/users/:userId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date } = req.query
    const data = await getCommunityUser(
      req.userId,
      req.params.userId,
      typeof date === 'string' ? date : undefined,
    )
    const logDate = data.date
    const [following, likes, comments] = await Promise.all([
      data.member.isSelf
        ? Promise.resolve(false)
        : isFollowing(req.userId, req.params.userId),
      getDayLikeStats(req.params.userId, logDate, req.userId),
      listDayComments(req.params.userId, logDate, req.userId),
    ])
    res.json({
      ...data,
      isFollowing: following,
      likeCount: likes.likeCount,
      viewerLiked: likes.viewerLiked,
      comments,
    })
  }),
)

router.put(
  '/community/users/:userId/log-items/:itemType/:itemId/reaction',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { itemType, itemId } = req.params
    const { reaction } = req.body
    const data = await setLogItemReaction(
      req.userId,
      req.params.userId,
      itemType,
      itemId,
      reaction ?? null,
    )
    res.json(data)
  }),
)

router.post(
  '/community/users/:userId/follow',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await followUser(req.userId, req.params.userId)
    res.json(data)
  }),
)

router.delete(
  '/community/users/:userId/follow',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await unfollowUser(req.userId, req.params.userId)
    res.json(data)
  }),
)

router.post(
  '/community/users/:userId/likes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date } = req.body
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供 date' })
    }
    const data = await likeDay(req.userId, req.params.userId, date)
    res.json(data)
  }),
)

router.delete(
  '/community/users/:userId/likes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const date = req.query.date
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供 date' })
    }
    const data = await unlikeDay(req.userId, req.params.userId, date)
    res.json(data)
  }),
)

router.post(
  '/community/users/:userId/dislikes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date } = req.body
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供 date' })
    }
    const data = await dislikeDay(req.userId, req.params.userId, date)
    res.json(data)
  }),
)

router.delete(
  '/community/users/:userId/dislikes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const date = req.query.date
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供 date' })
    }
    const data = await undislikeDay(req.userId, req.params.userId, date)
    res.json(data)
  }),
)

router.get(
  '/community/users/:userId/comments',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const date = req.query.date
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供 date' })
    }
    const comments = await listDayComments(
      req.params.userId,
      date,
      req.userId,
    )
    res.json({ comments })
  }),
)

router.post(
  '/community/users/:userId/comments',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date, body, parentCommentId } = req.body
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供 date' })
    }
    const comment = await addDayComment(
      req.userId,
      req.params.userId,
      date,
      body,
      parentCommentId ?? null,
    )
    res.json(comment)
  }),
)

router.delete(
  '/community/comments/:commentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await deleteDayComment(req.userId, req.params.commentId)
    res.json({ ok: true })
  }),
)

router.post(
  '/community/comments/:commentId/likes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await likeDayComment(req.userId, req.params.commentId)
    res.json(data)
  }),
)

router.delete(
  '/community/comments/:commentId/likes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await unlikeDayComment(req.userId, req.params.commentId)
    res.json(data)
  }),
)

router.post(
  '/community/comments/:commentId/dislikes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await dislikeDayComment(req.userId, req.params.commentId)
    res.json(data)
  }),
)

router.delete(
  '/community/comments/:commentId/dislikes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await undislikeDayComment(req.userId, req.params.commentId)
    res.json(data)
  }),
)

router.get(
  '/community/users/:userId/month',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { year, month } = req.query
    if (!year || !month) {
      return res.status(400).json({ error: '请提供 year 与 month' })
    }
    const data = await getCommunityUserMonth(
      req.userId,
      req.params.userId,
      year,
      month,
    )
    res.json(data)
  }),
)

export default router
