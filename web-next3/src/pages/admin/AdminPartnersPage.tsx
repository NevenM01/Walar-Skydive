import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useToast } from '../../hooks/useToast'
import {
  adminFormControlClassNoMt,
  adminFormHintClass,
  adminFormLabelClass,
  adminPageDescClass,
  adminPrimaryButtonClass,
} from '../../lib/adminFormClasses'
import { getProjectPartners } from '../../lib/api'
import {
  deleteProjectPartnerInSupabase,
  insertProjectPartnerInSupabase,
  isPartnersTableMissingError,
  updateProjectPartnerInSupabase,
} from '../../lib/partnersFromSupabase'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { cn } from '../../lib/cn'
import type { ProjectPartner, ProjectPartnerKind } from '../../types'
import { Skeleton } from '../../components/ui/Skeleton'

const KIND_OPTIONS: { value: ProjectPartnerKind; label: string; hint: string }[] = [
  { value: 'sponsor', label: 'Sponsor', hint: 'Listed under Partners' },
  { value: 'advertiser', label: 'Advertiser', hint: 'Listed under Partners' },
  { value: 'supporter', label: 'Supporter', hint: 'Listed under Supporters' },
]

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function byPartnerOrder(a: ProjectPartner, b: ProjectPartner) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.name.localeCompare(b.name)
}

function emptyForm(): {
  name: string
  url: string
  kind: ProjectPartnerKind
  tagline: string
  sortOrder: string
} {
  return { name: '', url: 'https://', kind: 'supporter', tagline: '', sortOrder: '0' }
}

export default function AdminPartnersPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState<ProjectPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [partnersTableMissing, setPartnersTableMissing] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([])
      setPartnersTableMissing(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setPartnersTableMissing(false)
    try {
      setRows(await getProjectPartners())
    } catch (e) {
      if (isPartnersTableMissingError(e)) {
        setPartnersTableMissing(true)
      } else {
        showToast(e instanceof Error ? e.message : 'Failed to load partners.', 'default')
      }
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void load()
  }, [load])

  const partnersBlock = useMemo(
    () => [...rows].filter((p) => p.kind !== 'supporter').sort(byPartnerOrder),
    [rows],
  )
  const supportersBlock = useMemo(
    () => [...rows].filter((p) => p.kind === 'supporter').sort(byPartnerOrder),
    [rows],
  )

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm())
  }

  function startEdit(p: ProjectPartner) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      url: p.url,
      kind: p.kind,
      tagline: p.tagline ?? '',
      sortOrder: String(p.sortOrder),
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    const url = form.url.trim()
    const tagline = form.tagline.trim()
    const sortOrder = Number.parseInt(form.sortOrder, 10)

    if (!name) {
      showToast('Name is required.', 'default')
      return
    }
    if (!isValidHttpUrl(url)) {
      showToast('Enter a valid http(s) URL.', 'default')
      return
    }
    if (!Number.isFinite(sortOrder)) {
      showToast('Sort order must be a number.', 'default')
      return
    }

    if (!isSupabaseConfigured()) {
      showToast('Supabase is not configured.', 'default')
      return
    }
    if (partnersTableMissing) {
      showToast('Create the partners table in Supabase first (see the notice above).', 'default')
      return
    }

    setSaving(true)
    try {
      const payload = { name, url, kind: form.kind, tagline, sortOrder }
      if (editingId) {
        const updated = await updateProjectPartnerInSupabase(editingId, payload)
        setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)))
        showToast('Partner updated.', 'success')
      } else {
        const created = await insertProjectPartnerInSupabase(payload)
        setRows((prev) => [...prev, created])
        showToast('Partner added.', 'success')
      }
      resetForm()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'default')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('Remove this entry from the public site?')) return
    if (!isSupabaseConfigured()) {
      showToast('Supabase is not configured.', 'default')
      return
    }
    if (partnersTableMissing) return
    try {
      await deleteProjectPartnerInSupabase(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      if (editingId === id) resetForm()
      showToast('Removed.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'default')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy">Partners & supporters</h1>
      <p className={adminPageDescClass}>
        Add sponsors and advertisers under <strong className="font-semibold">Partners</strong>, and community
        supporters under <strong className="font-semibold">Supporters</strong>. Entries appear on{' '}
        <strong className="font-semibold">/partners</strong> and the home page teaser.
      </p>

      {!isSupabaseConfigured() && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Supabase env vars are missing — partner management is disabled until the app is configured.
        </p>
      )}

      {isSupabaseConfigured() && partnersTableMissing && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50/95 px-4 py-4 text-sm text-rose-950 dark:border-rose-900/55 dark:bg-rose-950/45 dark:text-rose-50"
        >
          <p className="font-semibold">Partners table is not on your Supabase project yet</p>
          <p className="mt-2 leading-relaxed text-rose-900/95 dark:text-rose-100/90">
            The app expects <code className="rounded bg-rose-100/90 px-1.5 py-0.5 text-xs dark:bg-rose-900/70">public.walar_project_partners</code>.
            Open{' '}
            <strong className="font-semibold">Supabase Dashboard → SQL Editor</strong>, paste the SQL from the repo file{' '}
            <code className="rounded bg-rose-100/90 px-1.5 py-0.5 text-xs dark:bg-rose-900/70">supabase/migrations/20260401120000_walar_project_partners.sql</code>, run it, then refresh this page or use Retry below.
          </p>
          <p className="mt-2 text-xs text-rose-800/90 dark:text-rose-200/85">
            If you use the Supabase CLI locally: run <code className="rounded bg-rose-100/80 px-1 dark:bg-rose-900/60">supabase db push</code> from the project root (with the project linked).
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-500"
          >
            Retry after migration
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className={cn(
          'mt-8 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900/80 sm:p-6',
          partnersTableMissing && 'pointer-events-none opacity-50',
        )}
        aria-disabled={partnersTableMissing}
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {editingId ? 'Edit entry' : 'Add entry'}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={adminFormLabelClass}>Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={adminFormControlClassNoMt('mt-1')}
              autoComplete="organization"
              required
            />
          </label>
          <label className="sm:col-span-2">
            <span className={adminFormLabelClass}>Website URL</span>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              className={adminFormControlClassNoMt('mt-1')}
              type="url"
              inputMode="url"
              placeholder="https://"
            />
          </label>
          <label>
            <span className={adminFormLabelClass}>Type</span>
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({ ...f, kind: e.target.value as ProjectPartnerKind }))
              }
              className={adminFormControlClassNoMt('mt-1')}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className={cn(adminFormHintClass, 'mt-1')}>
              {KIND_OPTIONS.find((o) => o.value === form.kind)?.hint}
            </p>
          </label>
          <label>
            <span className={adminFormLabelClass}>Sort order</span>
            <input
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className={adminFormControlClassNoMt('mt-1')}
              inputMode="numeric"
            />
            <p className={cn(adminFormHintClass, 'mt-1')}>Lower numbers appear first within each group.</p>
          </label>
          <label className="sm:col-span-2">
            <span className={adminFormLabelClass}>Tagline (optional)</span>
            <input
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              className={adminFormControlClassNoMt('mt-1')}
              placeholder="e.g. Drop zone · Equipment"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className={adminPrimaryButtonClass}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Current listings
      </h2>

      {loading ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : partnersTableMissing ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Listings will appear here after the database table exists.
        </p>
      ) : (
        <div className="mt-4 space-y-8">
          <PartnerTable
            title="Partners (sponsors & advertisers)"
            rows={partnersBlock}
            onEdit={startEdit}
            onDelete={(id) => void onDelete(id)}
          />
          <PartnerTable
            title="Supporters"
            rows={supportersBlock}
            onEdit={startEdit}
            onDelete={(id) => void onDelete(id)}
          />
        </div>
      )}
    </div>
  )
}

function PartnerTable({
  title,
  rows,
  onEdit,
  onDelete,
}: {
  title: string
  rows: ProjectPartner[]
  onEdit: (p: ProjectPartner) => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-walar-navy">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No entries yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-600">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr
                  key={p.id}
                  className={
                    i % 2 === 1 ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900/80'
                  }
                >
                  <td className="px-4 py-3 font-medium text-walar-navy">{p.name}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 underline hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      {p.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">{p.kind}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{p.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="mr-2 text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p.id)}
                      className="text-sm font-semibold text-red-700 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
