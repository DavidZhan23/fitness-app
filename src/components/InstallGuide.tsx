/** 安卓 / 鸿蒙安装说明（系统浏览器对 PWA 支持差异大） */

function InstallGuideContent() {
  return (
    <>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        iPhone 用 Safari「添加到主屏幕」即可。安卓建议用
        <strong className="font-normal text-secondary"> Chrome 浏览器</strong>
        打开本页，体验最接近独立 App。
      </p>

      <div className="mt-3 space-y-3 text-sm">
        <div className="install-guide-tip install-guide-tip--recommend px-3 py-2.5">
          <p className="font-medium">推荐：Chrome（安卓）</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-muted">
            <li>用 Chrome 打开本站地址</li>
            <li>点右上角 ⋮ 菜单</li>
            <li>选择「安装应用」或「添加到主屏幕」</li>
            <li>确认安装后，从桌面图标打开（应无浏览器地址栏）</li>
          </ol>
        </div>
        <div className="install-guide-tip install-guide-tip--note px-3 py-2.5">
          <p className="font-medium">小米 / 华为自带浏览器</p>
          <p className="mt-1 text-xs leading-relaxed">
            部分机型「添加到桌面」只是网页快捷方式，可能没有图标、仍会显示地址栏。
            若遇此情况，请复制链接到 Chrome 再安装，或为站点配置 HTTPS 后重试。
          </p>
        </div>
      </div>
    </>
  )
}

interface InstallGuideProps {
  /** 设置页：默认折叠，仅显示标题行 */
  collapsible?: boolean
}

export function InstallGuide({ collapsible = false }: InstallGuideProps) {
  if (collapsible) {
    return (
      <details className="install-guide-card group">
        <summary className="install-guide-card__summary settings-menu-summary cursor-pointer list-none px-4 py-3 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            添加到手机桌面
            <span
              className="settings-menu-chevron transition group-open:rotate-90"
              aria-hidden
            >
              ▸
            </span>
          </span>
        </summary>
        <div className="install-guide-card__body border-t px-4 pb-4 pt-1">
          <InstallGuideContent />
        </div>
      </details>
    )
  }

  return (
    <section className="install-guide-card p-4">
      <h2 className="install-guide-card__summary settings-menu-summary text-sm font-normal">
        添加到手机桌面
      </h2>
      <InstallGuideContent />
    </section>
  )
}
