import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware, requireDeveloper } from '../auth.js'
import {
  listDeveloperCommunityMembers,
  setDeveloperCommunityVisibility,
} from '../developerCommunity.js'

const router = Router()

router.get(
  '/developer/community-members',
  authMiddleware,
  requireDeveloper,
  asyncHandler(async (_req, res) => {
    const members = await listDeveloperCommunityMembers()
    res.json({ members })
  }),
)

router.patch(
  '/developer/community-members/:userId/visibility',
  authMiddleware,
  requireDeveloper,
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId?.trim()) {
      return res.status(400).json({ error: 'userId 无效' })
    }
    if (req.body?.community_visible === undefined) {
      return res.status(400).json({ error: '缺少 community_visible' })
    }
    const data = await setDeveloperCommunityVisibility(
      userId,
      Boolean(req.body.community_visible),
    )
    res.json(data)
  }),
)

export default router
