import type { AuthError } from '@supabase/supabase-js'

/** Map Supabase auth errors to clearer Chinese messages. */
export function formatAuthError(err: unknown): string {
  if (!err || typeof err !== 'object') return '操作失败，请重试'

  const auth = err as AuthError & { code?: string; error_code?: string }
  const code = auth.code ?? auth.error_code ?? ''
  const msg = auth.message ?? ''

  if (code === 'email_not_confirmed' || msg.includes('Email not confirmed')) {
    return '邮箱尚未验证。请查收注册邮件并点击确认链接，或在 Supabase 关闭「Confirm email」后重新注册。'
  }

  if (
    code === 'invalid_credentials' ||
    msg.includes('Invalid login credentials')
  ) {
    return '邮箱或密码错误。若刚注册：请先查收验证邮件；若之前注册失败，请点「注册」重新创建账号。'
  }

  if (code === 'user_already_registered' || msg.includes('already registered')) {
    return '该邮箱已注册，请直接登录；若无法登录，请先完成邮箱验证或重置密码。'
  }

  if (code === 'email_address_invalid') {
    return '邮箱格式无效，请使用真实邮箱（如 Gmail、QQ 邮箱）。'
  }

  if (code === 'weak_password' || msg.includes('Password')) {
    return '密码不符合要求，请至少 6 位。'
  }

  return msg || '操作失败，请重试'
}
