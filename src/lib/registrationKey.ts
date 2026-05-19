/** Supabase 直连时前端校验；自托管以服务端 REGISTRATION_KEY 为准 */
const EXPECTED = import.meta.env.VITE_REGISTRATION_KEY ?? '454676'

export function assertRegistrationKey(key: string) {
  if (key.trim() !== EXPECTED) {
    throw new Error('注册密钥不正确')
  }
}
