/** 注册邀请密钥（环境变量 REGISTRATION_KEY，必填） */
export function getRegistrationKey() {
  const key = process.env.REGISTRATION_KEY?.trim()
  if (!key) {
    throw new Error(
      'REGISTRATION_KEY must be set in environment (copy server/.env.example to server/.env)',
    )
  }
  return key
}

export function assertRegistrationKey(key) {
  const expected = getRegistrationKey()
  if (String(key ?? '').trim() !== expected) {
    const err = new Error('注册密钥不正确')
    err.status = 403
    throw err
  }
}
