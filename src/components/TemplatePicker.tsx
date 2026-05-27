interface TemplateItem {
  id?: string
  name: string
  kcal: number
}

interface TemplatePickerProps {
  templates: TemplateItem[]
  onSelect: (name: string, kcal: number) => void
}

export function TemplatePicker({ templates, onSelect }: TemplatePickerProps) {
  if (templates.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">快捷模板</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id ?? t.name}
            type="button"
            onClick={() => onSelect(t.name, t.kcal)}
            className="log-template-chip px-3 py-1.5 text-sm"
          >
            {t.name}{' '}
            <span className="log-template-chip__kcal tabular-nums">
              {Math.round(t.kcal)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
