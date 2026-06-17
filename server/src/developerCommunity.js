import { query } from './db.js'
import { loadProfile } from './community.js'
import { publicNickname } from './publicProfile.js'

export async function listDeveloperCommunityMembers() {
  const { rows } = await query(
    `select p.id,
            p.nickname,
            p.community_visible,
            p.onboarding_complete,
            p.created_at,
            u.email
     from profiles p
     join users u on u.id = p.id
     order by p.community_visible desc,
              p.onboarding_complete desc,
              coalesce(nullif(trim(p.nickname), ''), u.email) asc`,
  )

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    nickname: publicNickname(row),
    communityVisible: Boolean(row.community_visible),
    onboardingComplete: Boolean(row.onboarding_complete),
    createdAt: row.created_at,
  }))
}

export async function setDeveloperCommunityVisibility(userId, visible) {
  const profile = await loadProfile(userId)
  if (!profile) {
    const err = new Error('用户不存在')
    err.status = 404
    throw err
  }

  const flag = Boolean(visible)
  await query(
    `update profiles set community_visible = $1, updated_at = now() where id = $2`,
    [flag, userId],
  )

  return {
    id: userId,
    communityVisible: flag,
  }
}
