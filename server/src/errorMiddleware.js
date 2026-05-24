const PG_ERROR_MESSAGES = {
  23514: '资料数值不合法，请检查体重、身高等',
  '22P02': '资料格式错误，请检查输入',
  22003: '数值超出范围，请检查活动系数等',
  42703: '数据库需要升级，请重启 API 服务或联系管理员执行迁移',
}

export function translatePgError(err) {
  if (err.code && PG_ERROR_MESSAGES[err.code]) {
    return PG_ERROR_MESSAGES[err.code]
  }
  return null
}

export function errorHandler(err, req, res, _next) {
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
      const pgMessage = translatePgError(err)
      message = pgMessage ?? '服务器繁忙，请稍后重试'
    }
    console.error('[api]', req.method, req.path, err.code, err.detail || err.message)
  }
  res.status(status).json({ error: message })
}
