import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Competition, CompetitionStatus } from '../../types'
import { formatDateRange } from '../../lib/formatDate'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  adminFormControlClassNoMt,
  adminFormHintClass,
  adminFormLabelClass,
  adminPageDescClass,
  adminPrimaryButtonClass,
} from '../../lib/adminFormClasses'
import { cn } from '../../lib/cn'
import {
  insertCompetitionInSupabase,
  updateCompetitionInSupabase,
  updateCompetitionUniqueLabelInSupabase,
  deleteCompetitionInSupabase,
} from '../../lib/competitionsFromSupabase'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { getCompetitionsForAdmin } from '../../lib/api'
import { useToast } from '../../hooks/useToast'

const STATUS_OPTIONS: { value: CompetitionStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'results_published', label: 'Results published' },
]

function defaultForm() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const today = `${y}-${m}-${day}`
  return {
    name: '',
    startDate: today,
    endDate: today,
    location: '',
    category: 'Open',
    status: 'upcoming' as CompetitionStatus,
    faiClass: '',
    description: '',
    uniqueLabel: '',
  }
}

export default function AdminCompetitionsPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importLabelDrafts, setImportLabelDrafts] = useState<Record<string, string>>({})
  const [savingImportLabelId, setSavingImportLabelId] = useState<string | null>(null)

  const closeAddDialog = useCallback(() => {
    setAddOpen(false)
    setEditingId(null)
    setForm(defaultForm())
  }, [])

  useEffect(() => {
    if (!addOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAddDialog()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addOpen, closeAddDialog])

  useEffect(() => {
    if (!addOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [addOpen])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await getCompetitionsForAdmin())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setImportLabelDrafts(Object.fromEntries(rows.map((r) => [r.id, r.uniqueLabel ?? ''])))
  }, [rows])

  const supabaseOk = isSupabaseConfigured()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      showToast('Configure Supabase in .env.local.', 'default')
      return
    }
    if (!form.name.trim() || !form.location.trim()) {
      showToast('Name and location are required.', 'default')
      return
    }
    if (form.endDate < form.startDate) {
      showToast('End date must be on or after start date.', 'default')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        location: form.location,
        category: form.category,
        status: form.status,
        faiClass: form.faiClass,
        description: form.description,
        uniqueLabel: form.uniqueLabel,
      }

      if (editingId) {
        await updateCompetitionInSupabase(editingId, payload)
        showToast('Event updated.', 'success')
      } else {
        await insertCompetitionInSupabase(payload)
        showToast('Event created.', 'success')
      }
      closeAddDialog()
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : editingId ? 'Could not update event.' : 'Could not create event.', 'default')
    } finally {
      setSaving(false)
    }
  }

  function openEditDialog(c: Competition) {
    setEditingId(c.id)
    setForm({
      name: c.name ?? '',
      startDate: c.startDate ?? defaultForm().startDate,
      endDate: c.endDate ?? defaultForm().endDate,
      location: c.location ?? '',
      category: c.category ?? 'Open',
      status: c.status ?? ('upcoming' as CompetitionStatus),
      faiClass: c.faiClass ?? '',
      description: c.description ?? '',
      uniqueLabel: c.uniqueLabel ?? '',
    })
    setAddOpen(true)
  }

  async function onDelete(c: Competition) {
    if (!supabaseOk) return
    const ok = window.confirm(
      `Delete "${c.name}"?\n\nThis will remove the competition. If there are results linked to it, the delete may be blocked by the database.`,
    )
    if (!ok) return
    setSaving(true)
    try {
      await deleteCompetitionInSupabase(c.id)
      showToast('Event deleted.', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete event.', 'default')
    } finally {
      setSaving(false)
    }
  }

  async function saveImportLabel(competitionId: string) {
    if (!supabaseOk) return
    setSavingImportLabelId(competitionId)
    try {
      await updateCompetitionUniqueLabelInSupabase(competitionId, importLabelDrafts[competitionId] ?? '')
      showToast('Competition label saved — matches Excel "Competition label" column.', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save label.', 'default')
    } finally {
      setSavingImportLabelId(null)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy dark:text-slate-100">Events</h1>
      <p className={adminPageDescClass}>
        Create competitions and open the public event page from the list. Adding events requires Supabase and an admin
        account.
      </p>

      {!supabaseOk && (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          Supabase is not configured — list is empty and creation is disabled until{' '}
          <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">.env.local</code> is set.
        </p>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={adminPrimaryButtonClass}
        >
          Add event
        </button>
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close dialog"
            onClick={closeAddDialog}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-event-title"
            className="relative z-[1] max-h-[min(90vh,720px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-600">
              <h2
                id="add-event-title"
                className="font-display text-lg font-bold text-walar-navy dark:text-slate-100"
              >
                {editingId ? 'Edit event' : 'Add event'}
              </h2>
              <button
                type="button"
                onClick={closeAddDialog}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4">
        <div>
          <label className={adminFormLabelClass} htmlFor="ev-name">
            Name
          </label>
          <input
            id="ev-name"
            className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={!supabaseOk || saving}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={adminFormLabelClass} htmlFor="ev-start">
              Start date
            </label>
            <input
              id="ev-start"
              type="date"
              className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              disabled={!supabaseOk || saving}
              required
            />
          </div>
          <div>
            <label className={adminFormLabelClass} htmlFor="ev-end">
              End date
            </label>
            <input
              id="ev-end"
              type="date"
              className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              disabled={!supabaseOk || saving}
              required
            />
          </div>
        </div>

        <div>
          <label className={adminFormLabelClass} htmlFor="ev-location">
            Location
          </label>
          <input
            id="ev-location"
            className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            disabled={!supabaseOk || saving}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={adminFormLabelClass} htmlFor="ev-category">
              Category
            </label>
            <input
              id="ev-category"
              className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              disabled={!supabaseOk || saving}
            />
          </div>
          <div>
            <label className={adminFormLabelClass} htmlFor="ev-status">
              Status
            </label>
            <select
              id="ev-status"
              className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as CompetitionStatus }))
              }
              disabled={!supabaseOk || saving}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={adminFormLabelClass} htmlFor="ev-fai">
            FAI class <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="ev-fai"
            className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
            value={form.faiClass}
            onChange={(e) => setForm((f) => ({ ...f, faiClass: e.target.value }))}
            disabled={!supabaseOk || saving}
          />
        </div>

        <div>
          <label className={adminFormLabelClass} htmlFor="ev-desc">
            Description <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="ev-desc"
            rows={3}
            className={cn(adminFormControlClassNoMt(), 'mt-1.5 resize-y')}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            disabled={!supabaseOk || saving}
          />
        </div>

        <div>
          <label className={adminFormLabelClass} htmlFor="ev-label">
            Unique label <span className="font-normal text-slate-500">(optional, for CSV import)</span>
          </label>
          <input
            id="ev-label"
            className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
            value={form.uniqueLabel}
            onChange={(e) => setForm((f) => ({ ...f, uniqueLabel: e.target.value }))}
            disabled={!supabaseOk || saving}
            placeholder='e.g. "2025 EEAC Hungary"'
          />
        </div>

        <p className={adminFormHintClass}>Must be unique across events when filled.</p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" className={adminPrimaryButtonClass} disabled={!supabaseOk || saving}>
                  {saving ? (editingId ? 'Saving…' : 'Creating…') : editingId ? 'Save changes' : 'Create event'}
                </button>
                <button
                  type="button"
                  onClick={closeAddDialog}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="mt-10 font-display text-lg font-bold text-walar-navy dark:text-slate-100">All events</h2>

      {loading ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No events yet — use Add event.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-600 dark:border-slate-600 dark:bg-slate-800/90">
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="font-medium text-walar-navy dark:text-slate-100">{c.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDateRange(c.startDate, c.endDate)} · {c.location}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditDialog(c)}
                    disabled={!supabaseOk || saving}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(c)}
                    disabled={!supabaseOk || saving}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 shadow-sm transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/60"
                  >
                    Delete
                  </button>
                </div>
                {supabaseOk && (
                  <div className="flex max-w-xl flex-col gap-1.5 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label className={adminFormLabelClass} htmlFor={`import-label-${c.id}`}>
                        Competition label <span className="font-normal text-slate-500">(for results import)</span>
                      </label>
                      <input
                        id={`import-label-${c.id}`}
                        className={cn(adminFormControlClassNoMt(), 'mt-1')}
                        value={importLabelDrafts[c.id] ?? ''}
                        onChange={(e) =>
                          setImportLabelDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                        }
                        disabled={savingImportLabelId === c.id}
                        placeholder="Same text as in Excel template"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveImportLabel(c.id)}
                      disabled={savingImportLabelId === c.id}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      {savingImportLabelId === c.id ? 'Saving…' : 'Save label'}
                    </button>
                  </div>
                )}
              </div>
              <Link
                to={`/events/${c.id}`}
                className="shrink-0 text-sm font-medium text-walar-teal-dark hover:underline dark:text-sky-400 dark:hover:text-sky-300"
              >
                Public page
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
