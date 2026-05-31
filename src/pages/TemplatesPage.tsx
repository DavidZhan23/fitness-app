import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  RecordDeleteButton,
  RecordEditButton,
} from '../components/RecordActionIcons'
import { PageShell, SegmentedControl } from '../components/ui/responsive'
import { TemplateFormDialog } from '../features/templates/TemplateFormDialog'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import {
  formatTemplateChipHint,
  normalizeLogTemplate,
} from '../lib/logTemplate'
import type { LogTemplate } from '../types'

type TemplateKind = 'exercise' | 'meal'

type FormDialogState =
  | { mode: 'add' }
  | { mode: 'edit'; template: LogTemplate }

type DeleteConfirmState =
  | { kind: 'single'; id: string }
  | { kind: 'batch'; ids: string[] }

function resolveInitialTab(
  location: ReturnType<typeof useLocation>,
): TemplateKind {
  const stateTab = (location.state as { tab?: string } | null)?.tab
  if (stateTab === 'meal' || stateTab === 'exercise') return stateTab
  const queryTab = new URLSearchParams(location.search).get('tab')
  if (queryTab === 'meal' || queryTab === 'exercise') return queryTab
  return 'exercise'
}

function batchDeleteLabel(count: number) {
  return count > 0 ? `删除选中 (${count})` : '删除选中'
}

export function TemplatesPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<LogTemplate[]>([])
  const [meals, setMeals] = useState<LogTemplate[]>([])
  const [tab, setTab] = useState<TemplateKind>(() => resolveInitialTab(location))
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [formDialog, setFormDialog] = useState<FormDialogState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    const [ex, meal] = await Promise.all([
      httpData.listTemplates('exercise'),
      httpData.listTemplates('meal'),
    ])
    setExercises(
      ex
        .map((row) => normalizeLogTemplate(row, 'exercise'))
        .filter((t): t is LogTemplate => t != null),
    )
    setMeals(
      meal
        .map((row) => normalizeLogTemplate(row, 'meal'))
        .filter((t): t is LogTemplate => t != null),
    )
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setTab(resolveInitialTab(location))
  }, [location.key, location.state, location.search])

  const list = useMemo(
    () => (tab === 'exercise' ? exercises : meals),
    [tab, exercises, meals],
  )

  const exitBatchMode = () => {
    setBatchMode(false)
    setSelectedIds(new Set())
  }

  const openAddForm = () => {
    setFormError('')
    setFormDialog({ mode: 'add' })
  }

  const openEditForm = (template: LogTemplate) => {
    setFormError('')
    setFormDialog({ mode: 'edit', template })
  }

  const closeFormDialog = () => {
    if (saving) return
    setFormDialog(null)
    setFormError('')
  }

  const handleFormSubmit = async (values: {
    name: string
    unit: string
    kcalPerUnit: number
    defaultQuantity: number
  }) => {
    if (!formDialog || saving) return
    setSaving(true)
    setFormError('')
    try {
      if (formDialog.mode === 'add') {
        await httpData.addTemplate(tab, values)
      } else {
        await httpData.updateTemplate(tab, formDialog.template.id, values)
      }
      setFormDialog(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const runDelete = async (ids: string[]) => {
    setDeleting(true)
    setPageError('')
    try {
      for (const id of ids) {
        await httpData.deleteTemplate(tab, id)
      }
      setDeleteConfirm(null)
      exitBatchMode()
      await load()
    } catch (err) {
      setPageError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleTabChange = (next: TemplateKind) => {
    setTab(next)
    exitBatchMode()
    closeFormDialog()
    setDeleteConfirm(null)
    setPageError('')
  }

  const selectedCount = selectedIds.size
  const batchDeleteIds =
    deleteConfirm?.kind === 'batch' ? deleteConfirm.ids : []

  const openBatchDeleteConfirm = () => {
    if (selectedCount === 0 || deleting) return
    setDeleteConfirm({
      kind: 'batch',
      ids: [...selectedIds],
    })
  }

  return (
    <PageShell>
      <div
        className={`templates-page${batchMode ? ' templates-page--batch-active' : ''}`}
        data-template-kind={tab}
      >
        <header className="log-page-header templates-page__header">
          {batchMode ? (
            <div className="templates-page__batch-bar">
              <p className="templates-page__batch-count">
                已选 {selectedCount} 个
              </p>
              <div className="templates-page__batch-actions">
                <button
                  type="button"
                  className="templates-page__batch-cancel"
                  onClick={exitBatchMode}
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="templates-page__batch-delete"
                  disabled={selectedCount === 0 || deleting}
                  onClick={openBatchDeleteConfirm}
                >
                  {batchDeleteLabel(selectedCount)}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="log-pill-btn log-page-back"
            >
              ← 返回
            </button>
          )}
          <h1 className="log-page-title">小满模板库</h1>
          <p className="templates-page__intro">
            管理常用模板，快捷记录时可以直接点选。
          </p>
        </header>

        <SegmentedControl
          columns={2}
          className="template-tab-row"
          role="tablist"
          aria-label="模板类型"
        >
          <TabButton
            kind="exercise"
            active={tab === 'exercise'}
            onClick={() => handleTabChange('exercise')}
          >
            运动
          </TabButton>
          <TabButton
            kind="meal"
            active={tab === 'meal'}
            onClick={() => handleTabChange('meal')}
          >
            饮食
          </TabButton>
        </SegmentedControl>

        {pageError ? (
          <p className="text-sm text-red-400" role="alert">
            {pageError}
          </p>
        ) : null}

        <div className="templates-page__list-header">
          <div className="templates-page__list-heading">
            <h2 className="templates-page__list-title">模板列表</h2>
            <p className="templates-page__list-desc">
              {batchMode
                ? `已选 ${selectedCount} 个`
                : tab === 'exercise'
                  ? '运动常用模板'
                  : '饮食常用模板'}
            </p>
          </div>
          {batchMode ? null : (
            <button
              type="button"
              className="log-pill-btn"
              onClick={() => setBatchMode(true)}
            >
              批量管理
            </button>
          )}
        </div>

        <div className="log-template-chip-grid templates-page__grid">
          {!batchMode ? (
            <button
              type="button"
              className="template-library-add-card"
              onClick={openAddForm}
            >
              <span className="template-library-add-card__title">+ 添加模板</span>
              <span className="template-library-add-card__hint">
                新增一个常用项目
              </span>
            </button>
          ) : null}

          {list.map((template) => {
            const hint = formatTemplateChipHint(template)
            const selected = selectedIds.has(template.id)

            if (batchMode) {
              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={selected}
                  className={`template-manage-chip template-manage-chip--batch${
                    selected ? ' template-manage-chip--selected' : ''
                  }`}
                  onClick={() => toggleSelected(template.id)}
                >
                  <div className="template-manage-chip__card log-template-chip">
                    <span className="template-manage-chip__check" aria-hidden>
                      {selected ? '✓' : ''}
                    </span>
                    <span className="log-template-chip__name">{template.name}</span>
                    {hint ? (
                      <span className="log-template-chip__hint">{hint}</span>
                    ) : null}
                  </div>
                </button>
              )
            }

            return (
              <article
                key={template.id}
                className="template-manage-chip log-template-chip template-manage-chip__card"
              >
                <div className="template-manage-chip__actions">
                  <RecordEditButton onClick={() => openEditForm(template)} />
                  <RecordDeleteButton
                    onClick={() =>
                      setDeleteConfirm({ kind: 'single', id: template.id })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="template-manage-chip__body"
                  onClick={() => openEditForm(template)}
                >
                  <span className="log-template-chip__name">{template.name}</span>
                  {hint ? (
                    <span className="log-template-chip__hint">{hint}</span>
                  ) : null}
                </button>
              </article>
            )
          })}
        </div>

        {batchMode ? (
          <footer className="templates-page__batch-footer">
            <button
              type="button"
              className="templates-page__batch-delete-primary"
              disabled={selectedCount === 0 || deleting}
              onClick={openBatchDeleteConfirm}
            >
              {batchDeleteLabel(selectedCount)}
            </button>
          </footer>
        ) : null}

        <TemplateFormDialog
          open={formDialog != null}
          mode={formDialog?.mode === 'edit' ? 'edit' : 'add'}
          template={formDialog?.mode === 'edit' ? formDialog.template : null}
          kind={tab}
          saving={saving}
          error={formError}
          onClose={closeFormDialog}
          onSubmit={handleFormSubmit}
        />

        <ConfirmDialog
          open={deleteConfirm?.kind === 'single'}
          title="删除模板？"
          message="删除后不会影响已经保存的历史记录，但这个模板将不能再用于快捷记录。"
          confirmLabel="删除"
          loading={deleting}
          onCancel={() => {
            if (!deleting) setDeleteConfirm(null)
          }}
          onConfirm={() => {
            if (deleteConfirm?.kind === 'single') {
              void runDelete([deleteConfirm.id])
            }
          }}
        />

        <ConfirmDialog
          open={deleteConfirm?.kind === 'batch'}
          title="删除选中的模板？"
          message={`将删除 ${batchDeleteIds.length} 个模板。已保存的历史记录不会受影响。`}
          confirmLabel={`删除 ${batchDeleteIds.length} 个`}
          loading={deleting}
          onCancel={() => {
            if (!deleting) setDeleteConfirm(null)
          }}
          onConfirm={() => {
            if (deleteConfirm?.kind === 'batch') {
              void runDelete(deleteConfirm.ids)
            }
          }}
        />
      </div>
    </PageShell>
  )
}

function TabButton({
  kind,
  active,
  onClick,
  children,
}: {
  kind: TemplateKind
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`template-tab rounded-lg py-2 text-sm font-medium ${
        active
          ? kind === 'exercise'
            ? 'template-tab--active-exercise'
            : 'template-tab--active-meal'
          : 'template-tab--inactive'
      }`}
    >
      {children}
    </button>
  )
}
