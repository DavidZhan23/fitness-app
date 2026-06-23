import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import {
  ensureLatestUserWeeklyReport,
  getUserWeeklyReport,
  listUserWeeklyReports,
  markUserWeeklyReportViewed,
  shareUserWeeklyReportToCommunity,
  unshareUserWeeklyReportFromCommunity,
} from '../userWeeklyReport.js'

const router = Router()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

router.post(
  '/weekly-reports/ensure-latest',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json(await ensureLatestUserWeeklyReport(req.userId, query))
  }),
)

router.get(
  '/weekly-reports',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ reports: await listUserWeeklyReports(req.userId, query) })
  }),
)

router.get(
  '/weekly-reports/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: '周报 id 无效' })
    const report = await getUserWeeklyReport(req.userId, req.params.id, query)
    if (!report) return res.status(404).json({ error: '周报不存在' })
    res.json(report)
  }),
)

router.patch(
  '/weekly-reports/:id/viewed',
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: '周报 id 无效' })
    const report = await markUserWeeklyReportViewed(req.userId, req.params.id, query)
    if (!report) return res.status(404).json({ error: '周报不存在' })
    res.json(report)
  }),
)

router.post(
  '/weekly-reports/:id/share-community',
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: '周报 id 无效' })
    const report = await shareUserWeeklyReportToCommunity(req.userId, req.params.id, query)
    if (!report) return res.status(404).json({ error: '周报不存在' })
    res.json(report)
  }),
)

router.delete(
  '/weekly-reports/:id/share-community',
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: '周报 id 无效' })
    const report = await unshareUserWeeklyReportFromCommunity(req.userId, req.params.id, query)
    if (!report) return res.status(404).json({ error: '周报不存在' })
    res.json(report)
  }),
)

export default router
