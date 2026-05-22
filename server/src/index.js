import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { asyncHandler } from './asyncHandler.js'
import { buildProfileUpdate } from './profilePatch.js'
import { authMiddleware, loginUser, registerUser, signToken } from './auth.js'
import { assertRegistrationKey } from './registrationKey.js'
import {
  getCommunityUser,
  getCommunityUserMonth,
  listCommunityMembers,
} from './community.js'
import { saveCommunityMemberOrder } from './communityOrder.js'
import { setLogItemReaction } from './logItemReactions.js'
import {
  addDayComment,
  deleteDayComment,
  enrichMembersSocial,
  followUser,
  getDayLikeStats,
  isFollowing,
  likeDay,
  listDayComments,
  unfollowUser,
  unlikeDay,
} from './social.js'
import { query, waitForDb } from './db.js'
import {
  getCommunityInboxUnread,
  markCommunityInboxRead,
} from './communityInbox.js'
import {
  afterDayLogChanged,
  afterDayLogIdChanged,
  afterExerciseOrMealChanged,
} from './dayLogMutation.js'
import {
  estimateKcalFromDescription,
  getDeepSeekApiKey,
} from './deepseekKcal.js'

const app = express()
const port = Number(process.env.PORT || 3001)

const corsOrigin = process.env.CORS_ORIGIN || '*'
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }))
app.use(express.json())

app.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await query('select 1')
    res.json({ ok: true, aiConfigured: Boolean(getDeepSeekApiKey()) })
  }),
)

app.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const { email, password, registration_key } = req.body
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: '邮箱与密码（至少6位）必填' })
    }
    assertRegistrationKey(registration_key)
    const user = await registerUser(email, password)
    const token = signToken(user)
    res.json({
      token,
      user: { id: user.id, email: user.email },
      needsEmailConfirmation: false,
    })
  }),
)

app.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body
    const user = await loginUser(email, password)
    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  }),
)

app.get(
  '/auth/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ user: { id: req.userId, email: req.userEmail } })
  }),
)

app.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`select * from profiles where id = $1`, [
      req.userId,
    ])
    if (!rows[0]) return res.status(404).json({ error: '资料不存在' })
    res.json(rows[0])
  }),
)

app.patch(
  '/profile',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { updates, values } = buildProfileUpdate(req.body)
    if (updates.length === 0) {
      return res.status(400).json({ error: '无有效更新字段' })
    }
    values.push(req.userId)
    const idParam = values.length
    const { rows } = await query(
      `update profiles set ${updates.join(', ')} where id = $${idParam} returning *`,
      values,
    )
    if (!rows[0]) return res.status(404).json({ error: '资料不存在' })
    res.json(rows[0])
  }),
)

app.post(
  '/ai/estimate-kcal',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { type, description } = req.body
    if (type !== 'exercise' && type !== 'meal') {
      return res.status(400).json({ error: 'type 须为 exercise 或 meal' })
    }
    const { rows } = await query(
      `select weight_kg from profiles where id = $1`,
      [req.userId],
    )
    const result = await estimateKcalFromDescription({
      type,
      description,
      profile: rows[0] || {},
    })
    res.json(result)
  }),
)

app.get(
  '/day-logs/range',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const { rows } = await query(
      `select * from day_logs where user_id = $1 and log_date >= $2 and log_date <= $3 order by log_date`,
      [req.userId, from, to],
    )
    res.json(rows)
  }),
)

app.get(
  '/day-logs/:date',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date } = req.params
    let { rows } = await query(
      `select * from day_logs where user_id = $1 and log_date = $2`,
      [req.userId, date],
    )
    let dayLog = rows[0]
    if (!dayLog) {
      const profile = await query(`select tdee from profiles where id = $1`, [
        req.userId,
      ])
      const tdee = profile.rows[0]?.tdee ?? 0
      const ins = await query(
        `insert into day_logs (user_id, log_date, tdee_snapshot, deficit)
         values ($1, $2, $3, $3) returning *`,
        [req.userId, date, tdee],
      )
      dayLog = ins.rows[0]
    }
    const [ex, meals] = await Promise.all([
      query(
        `select * from exercises where day_log_id = $1 order by created_at desc`,
        [dayLog.id],
      ),
      query(`select * from meals where day_log_id = $1 order by created_at desc`, [
        dayLog.id,
      ]),
    ])
    const visibility = await afterDayLogChanged(req.userId, date)
    res.json({
      dayLog,
      exercises: ex.rows,
      meals: meals.rows,
      community_visible: visibility?.community_visible,
    })
  }),
)

app.post(
  '/day-logs/ensure',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { log_date, tdee_snapshot } = req.body
    let { rows } = await query(
      `select * from day_logs where user_id = $1 and log_date = $2`,
      [req.userId, log_date],
    )
    if (rows[0]) return res.json(rows[0])
    const ins = await query(
      `insert into day_logs (user_id, log_date, tdee_snapshot, deficit)
       values ($1, $2, $3, $3) returning *`,
      [req.userId, log_date, tdee_snapshot],
    )
    res.json(ins.rows[0])
  }),
)

app.post(
  '/exercises',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { day_log_id, name, kcal } = req.body
    await query(
      `insert into exercises (day_log_id, user_id, name, kcal) values ($1, $2, $3, $4)`,
      [day_log_id, req.userId, name, kcal],
    )
    const { rows } = await query(`select * from day_logs where id = $1`, [
      day_log_id,
    ])
    const visibility = await afterDayLogIdChanged(req.userId, day_log_id)
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

app.patch(
  '/exercises/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, kcal } = req.body
    if (!name?.trim() || kcal == null || Number(kcal) <= 0) {
      return res.status(400).json({ error: '请填写名称和有效热量' })
    }
    const { rows } = await query(
      `update exercises set name = $1, kcal = $2
       where id = $3 and user_id = $4
       returning *`,
      [name.trim(), kcal, req.params.id, req.userId],
    )
    if (!rows[0]) return res.status(404).json({ error: '记录不存在' })
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'exercises',
    )
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

app.delete(
  '/exercises/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'exercises',
    )
    await query(`delete from exercises where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true, community_visible: visibility?.community_visible })
  }),
)

app.post(
  '/meals',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { day_log_id, name, kcal } = req.body
    await query(
      `insert into meals (day_log_id, user_id, name, kcal) values ($1, $2, $3, $4)`,
      [day_log_id, req.userId, name, kcal],
    )
    const { rows } = await query(`select * from day_logs where id = $1`, [
      day_log_id,
    ])
    const visibility = await afterDayLogIdChanged(req.userId, day_log_id)
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

app.patch(
  '/meals/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, kcal } = req.body
    if (!name?.trim() || kcal == null || Number(kcal) <= 0) {
      return res.status(400).json({ error: '请填写名称和有效热量' })
    }
    const { rows } = await query(
      `update meals set name = $1, kcal = $2
       where id = $3 and user_id = $4
       returning *`,
      [name.trim(), kcal, req.params.id, req.userId],
    )
    if (!rows[0]) return res.status(404).json({ error: '记录不存在' })
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'meals',
    )
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

app.delete(
  '/meals/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'meals',
    )
    await query(`delete from meals where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true, community_visible: visibility?.community_visible })
  }),
)

app.get(
  '/templates/:type',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const table =
      req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
    const { rows } = await query(
      `select * from ${table} where user_id = $1 order by name`,
      [req.userId],
    )
    res.json(rows)
  }),
)

app.post(
  '/templates/:type',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const table =
      req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
    const { name, kcal } = req.body
    const { rows } = await query(
      `insert into ${table} (user_id, name, kcal) values ($1, $2, $3) returning *`,
      [req.userId, name, kcal],
    )
    res.json(rows[0])
  }),
)

app.delete(
  '/templates/:type/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const table =
      req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
    await query(`delete from ${table} where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true })
  }),
)

app.get(
  '/community/inbox/unread',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await getCommunityInboxUnread(req.userId)
    res.json(data)
  }),
)

app.post(
  '/community/inbox/mark-read',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await markCommunityInboxRead(req.userId)
    res.json(data)
  }),
)

app.get(
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

app.put(
  '/community/member-order',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { memberIds } = req.body
    const data = await saveCommunityMemberOrder(req.userId, memberIds)
    res.json(data)
  }),
)

app.get(
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

app.put(
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

app.post(
  '/community/users/:userId/follow',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await followUser(req.userId, req.params.userId)
    res.json(data)
  }),
)

app.delete(
  '/community/users/:userId/follow',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await unfollowUser(req.userId, req.params.userId)
    res.json(data)
  }),
)

app.post(
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

app.delete(
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

app.get(
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

app.post(
  '/community/users/:userId/comments',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date, body } = req.body
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供 date' })
    }
    const comment = await addDayComment(
      req.userId,
      req.params.userId,
      date,
      body,
    )
    res.json(comment)
  }),
)

app.delete(
  '/community/comments/:commentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await deleteDayComment(req.userId, req.params.commentId)
    res.json({ ok: true })
  }),
)

app.get(
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

app.post(
  '/templates/seed',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { exerciseTemplates, mealTemplates } = req.body
    const exCount = await query(
      `select count(*)::int as c from exercise_templates where user_id = $1`,
      [req.userId],
    )
    if (Number(exCount.rows[0].c) === 0 && exerciseTemplates?.length) {
      for (const t of exerciseTemplates) {
        await query(
          `insert into exercise_templates (user_id, name, kcal) values ($1, $2, $3)`,
          [req.userId, t.name, t.kcal],
        )
      }
    }
    const mealCount = await query(
      `select count(*)::int as c from meal_templates where user_id = $1`,
      [req.userId],
    )
    if (Number(mealCount.rows[0].c) === 0 && mealTemplates?.length) {
      for (const t of mealTemplates) {
        await query(
          `insert into meal_templates (user_id, name, kcal) values ($1, $2, $3)`,
          [req.userId, t.name, t.kcal],
        )
      }
    }
    res.json({ ok: true })
  }),
)

// 注册 / 登录等业务错误（带 status）
app.use((err, req, res, _next) => {
  if (res.headersSent) return
  const status = err.status || 500
  if (status >= 500) {
    console.error('[api]', req.method, req.path, err)
  }
  let message = err.message || '请求失败'
  if (status >= 500) {
    const keepClientMessage =
      status === 502 || status === 503 || status === 504
    if (!keepClientMessage) {
      if (err.code === '23514') message = '资料数值不合法，请检查体重、身高等'
      else if (err.code === '22P02') message = '资料格式错误，请检查输入'
      else if (err.code === '22003') message = '数值超出范围，请检查活动系数等'
      else if (err.code === '42703') {
        message = '数据库需要升级，请重启 API 服务或联系管理员执行迁移'
      } else message = '服务器繁忙，请稍后重试'
    }
    console.error('[api]', req.method, req.path, err.code, err.detail || err.message)
  }
  res.status(status).json({ error: message })
})

async function start() {
  await waitForDb()
  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${port}`)
  })
}

start().catch((err) => {
  console.error('[api] failed to start', err)
  process.exit(1)
})
