/** 安卓 / 鸿蒙安装说明（系统浏览器对 PWA 支持差异大） */
export function InstallGuide() {
  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 ring-1 ring-slate-600/50">
      <h2 className="font-semibold text-slate-100">添加到手机桌面</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        iPhone 用 Safari「添加到主屏幕」即可。安卓建议用
        <strong className="font-normal text-slate-300"> Chrome 浏览器</strong>
        打开本页，体验最接近独立 App。
      </p>

      <div className="mt-3 space-y-3 text-sm">
        <div className="rounded-xl bg-slate-900/60 px-3 py-2.5">
          <p className="font-medium text-teal-300/90">推荐：Chrome（安卓）</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-muted">
            <li>用 Chrome 打开本站地址</li>
            <li>点右上角 ⋮ 菜单</li>
            <li>选择「安装应用」或「添加到主屏幕」</li>
            <li>确认安装后，从桌面图标打开（应无浏览器地址栏）</li>
          </ol>
        </div>
        <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-950/20 px-3 py-2.5">
          <p className="font-medium text-amber-200/90">小米 / 华为自带浏览器</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/75">
            部分机型「添加到桌面」只是网页快捷方式，可能没有图标、仍会显示地址栏。
            若遇此情况，请复制链接到 Chrome 再安装，或为站点配置 HTTPS 后重试。
          </p>
        </div>
      </div>
    </section>
  )
}
