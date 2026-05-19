/** 注册邀请密钥（环境变量 REGISTRATION_KEY，默认 454676） */
export function getRegistrationKey() {
  return process.env.REGISTRATION_KEY || '454676'
}

export function assertRegistrationKey(key) {
  const expected = getRegistrationKey()
  if (String(key ?? '').trim() !== expected) {
    const err = new Error('注册密钥不正确')
    err.status = 403
    throw err
  }
}
