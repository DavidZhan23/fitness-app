/** 捕获 async 路由里的异常，避免未处理 Promise 导致 Node 进程退出（Nginx 502） */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
