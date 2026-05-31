import {
  formatTemplateChipHint,
  getPreviewableTemplates,
} from '../lib/logTemplate'
import type { LogTemplate } from '../types'

interface TemplateEntryCardProps {
  kind: 'exercise' | 'meal'
  templates: LogTemplate[]
  onOpenAll: () => void
}

const ENTRY_DESC: Record<'exercise' | 'meal', string> = {
  meal: '常吃的食物可以用模板快速记录，确认数量后一次保存。',
  exercise: '常练的运动可以用模板快速记录，确认时长后一次保存。',
}

const EMPTY_PREVIEW = '还没有模板，先添加几个常用项目吧。'

export function TemplateEntryCard({
  kind,
  templates,
  onOpenAll,
}: TemplateEntryCardProps) {
  const previewTemplates = getPreviewableTemplates(templates, 4)

  return (
    <section aria-label="模板快捷记录" className="log-template-entry-card">
      <header className="log-template-entry-card__header">
        <h2 className="log-template-entry-card__title">模板快捷记录</h2>
        <button
          type="button"
          className="log-template-entry-card__action"
          onClick={onOpenAll}
        >
          查看全部
        </button>
      </header>
      <p className="log-template-entry-card__desc">{ENTRY_DESC[kind]}</p>
      <div className="log-template-entry-card__preview">
        {previewTemplates.length > 0 ? (
          <div className="log-template-chip-grid">
            {previewTemplates.map((template) => {
              const hint = formatTemplateChipHint(template)
              return (
                <button
                  key={template.id}
                  type="button"
                  className="log-template-chip"
                  onClick={onOpenAll}
                >
                  <span className="log-template-chip__name">{template.name}</span>
                  <span className="log-template-chip__hint">{hint}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="log-template-entry-card__empty">{EMPTY_PREVIEW}</p>
        )}
      </div>
    </section>
  )
}
