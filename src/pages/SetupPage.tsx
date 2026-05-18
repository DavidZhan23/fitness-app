import { isSelfHosted } from '../lib/config'

export function SetupPage() {
  return (
    <div className="safe-pt safe-pb flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold text-brand">需要配置后端</h1>

        {isSelfHosted ? (
          <>
            <p className="text-sm text-muted leading-relaxed">
              自托管模式请在 <code className="rounded bg-slate-800 px-1">.env.local</code>{' '}
              设置：
            </p>
            <pre className="rounded-lg bg-slate-900 p-3 text-xs text-slate-300 overflow-x-auto">
              {`VITE_BACKEND=selfhosted
VITE_API_URL=http://localhost:3001`}
            </pre>
            <p className="text-sm text-muted">
              腾讯云部署见{' '}
              <code className="rounded bg-slate-800 px-1">docs/tencent-cloud.md</code>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted leading-relaxed">
              Supabase 模式请复制 <code className="rounded bg-slate-800 px-1">.env.example</code>{' '}
              为 <code className="rounded bg-slate-800 px-1">.env.local</code> 并填入 URL 与
              anon key。
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>
                <a
                  href="https://supabase.com"
                  className="text-brand underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  supabase.com
                </a>{' '}
                创建项目
              </li>
              <li>执行 supabase/migrations/001_initial.sql</li>
              <li>关闭 Confirm email（本地测试）</li>
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
