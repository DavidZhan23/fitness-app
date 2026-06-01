import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatTemplateChipHint,
  measureTemplateChipColumns,
  templateKey,
} from '../lib/logTemplate'
import type { LogTemplate } from '../types'

const COLLAPSED_ROWS = 3

interface TemplateMultiPickerProps {
  templates: LogTemplate[]
  selectedKeys: Set<string>
  onToggle: (template: LogTemplate) => void
}

export function TemplateMultiPicker({
  templates,
  selectedKeys,
  onToggle,
}: TemplateMultiPickerProps) {
  const [expanded, setExpanded] = useState(false)
  const [columnCount, setColumnCount] = useState(2)
  const gridRef = useRef<HTMLDivElement>(null)

  const displayableTemplates = useMemo(
    () =>
      templates.filter((template) => formatTemplateChipHint(template) !== ''),
    [templates],
  )

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const updateColumns = () => {
      const style = getComputedStyle(grid)
      const gap = Number.parseFloat(style.columnGap || style.gap) || 8
      setColumnCount(measureTemplateChipColumns(grid.clientWidth, gap))
    }

    updateColumns()
    const observer = new ResizeObserver(updateColumns)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [displayableTemplates.length])

  if (displayableTemplates.length === 0) return null

  const collapsedLimit = columnCount * COLLAPSED_ROWS
  const hasMore = displayableTemplates.length > collapsedLimit
  const visibleTemplates = expanded
    ? displayableTemplates
    : displayableTemplates.slice(0, collapsedLimit)

  return (
    <div className="log-template-chip-region">
      <div ref={gridRef} className="log-template-chip-grid">
        {visibleTemplates.map((template) => {
          const key = templateKey(template)
          const selected = selectedKeys.has(key)
          const hint = formatTemplateChipHint(template)
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(template)}
              className={`log-template-chip ${
                selected ? 'log-template-chip--selected' : ''
              }`}
            >
              <span className="log-template-chip__name">{template.name}</span>
              <span className="log-template-chip__hint">{hint}</span>
            </button>
          )
        })}
      </div>
      {hasMore ? (
        <button
          type="button"
          className="log-template-expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? '收起' : '展开更多'}
        </button>
      ) : null}
    </div>
  )
}

interface TemplateSectionHeaderProps {
  manageTab: 'exercise' | 'meal'
  kind: 'exercise' | 'meal'
}

const SECTION_DESC: Record<'exercise' | 'meal', string> = {
  meal: '点选常吃食物，确认数量后一次记录。',
  exercise: '点选常练运动，确认时长后一次记录。',
}

export function TemplateSectionHeader({
  manageTab,
  kind,
}: TemplateSectionHeaderProps) {
  return (
    <div className="log-template-section__header">
      <div className="log-template-section__intro">
        <span className="log-section-title">常用模板</span>
        <p className="log-template-section__desc">{SECTION_DESC[kind]}</p>
      </div>
      <Link
        to="/templates"
        state={{ tab: manageTab }}
        className="log-pill-btn log-template-section__manage"
      >
        管理模板
      </Link>
    </div>
  )
}
