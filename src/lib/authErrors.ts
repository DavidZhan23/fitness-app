/** 将 API / 登录错误转为更易读的中文提示 */
export function formatAuthError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message)
    if (msg) return msg
  }
  return '操作失败，请重试'
}
