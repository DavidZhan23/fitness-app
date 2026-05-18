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
            className="rounded-full bg-slate-800 px-3 py-1.5 text-sm ring-1 ring-slate-600 hover:bg-slate-700"
          >
            {t.name}{' '}
            <span className="text-muted tabular-nums">{Math.round(t.kcal)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
