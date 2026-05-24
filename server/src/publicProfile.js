/** 社区/API 对外展示昵称（单点实现，勿在其它模块复制） */

export function publicNickname(profile) {
  const nick = profile?.nickname?.trim()
  if (nick) return nick.slice(0, 32)
  const id = profile?.id ?? ''
  return `健身者${String(id).slice(0, 6)}`
}

export function publicNicknameById(profileId, nickname) {
  const nick = nickname?.trim()
  if (nick) return nick.slice(0, 32)
  return `健身者${String(profileId).slice(0, 6)}`
}
