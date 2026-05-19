export function SetupPage() {
  return (
    <div className="page-standalone flex flex-col justify-center">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold text-brand">需要配置 API 地址</h1>
        <p className="text-sm text-muted leading-relaxed">
          请在项目根目录创建 <code className="rounded bg-slate-800 px-1">.env.local</code>{' '}
          并设置后端地址：
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-300">
          {`# 本地开发（先启动 server: cd server && npm run dev）
VITE_API_URL=http://localhost:3001

# 腾讯云生产构建由 deploy 脚本自动注入，一般无需手写`}
        </pre>
        <p className="text-sm text-muted">
          部署说明见{' '}
          <code className="rounded bg-slate-800 px-1">docs/腾讯云部署-一步步做.md</code>
        </p>
      </div>
    </div>
  )
}
