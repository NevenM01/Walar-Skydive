import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Athlete } from '../../types'
import { CountryFlag } from '../../components/shared/CountryFlag'
import {
  adminFormControlClassNoMt,
  adminFormHintClass,
  adminFormLabelClass,
  adminPageDescClass,
  adminPrimaryButtonClass,
} from '../../lib/adminFormClasses'
import { cn } from '../../lib/cn'
import { useToast } from '../../hooks/useToast'
import { Skeleton } from '../../components/ui/Skeleton'
import { deleteAthlete, updateAthlete } from '../../lib/api'
import { fetchAthletesPageFromSupabase } from '../../lib/athletesFromSupabase'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../../lib/supabaseClient'
import { cleanAthleteName } from '../../lib/cleanAthleteName'
import { fetchAvatarSignedUrl } from '../../lib/avatarSignedUrl'

const PAGE_SIZE = 30

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

type AthleteEditorForm = {
  displayName: string
  countryCode: string
  gender: 'M' | 'F'
  dateOfBirth: string
  faiLicence: string
  dobDisplayMode: 'age' | 'date'
  gdprPublishFullName: boolean
  gdprConsentGiven: boolean
  userId: string
}

function emptyEditorForm(): AthleteEditorForm {
  return {
    displayName: '',
    countryCode: '',
    gender: 'M',
    dateOfBirth: '',
    faiLicence: '',
    dobDisplayMode: 'age',
    gdprPublishFullName: false,
    gdprConsentGiven: false,
    userId: '',
  }
}

export default function AdminAthletesPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState<Athlete[]>([])
  const [pendingPreview, setPendingPreview] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AthleteEditorForm>(emptyEditorForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        setRows([])
        setTotal(0)
        return
      }
      const offset = (page - 1) * PAGE_SIZE
      const res = await fetchAthletesPageFromSupabase({
        query: debouncedQuery,
        offset,
        limit: PAGE_SIZE,
      })
      setRows(res.rows)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, page])

  useEffect(() => {
    void load()
  }, [load])

  // Fetch signed previews for pending avatars on the current page.
  useEffect(() => {
    const pending = rows.filter((a) => Boolean(a.pendingAvatarPath))
    if (pending.length === 0) return
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        pending.map(async (a) => {
          try {
            const url = await fetchAvatarSignedUrl({ athleteId: a.id, kind: 'pending' })
            return [a.id, url] as const
          } catch {
            return [a.id, null] as const
          }
        }),
      )
      if (cancelled) return
      setPendingPreview((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    })()
    return () => { cancelled = true }
  }, [rows])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const openEdit = useCallback((a: Athlete) => {
    setEditingId(a.id)
    setForm({
      displayName: a.displayName ?? '',
      countryCode: a.countryCode ?? '',
      gender: a.gender ?? 'M',
      dateOfBirth: a.dateOfBirth ?? '',
      faiLicence: a.faiLicence ?? '',
      dobDisplayMode: a.dobDisplayMode ?? 'age',
      gdprPublishFullName: a.gdprFlags.publishFullName,
      gdprConsentGiven: a.gdprFlags.consentGiven,
      userId: a.userId ?? '',
    })
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditingId(null)
    setSaving(false)
    setForm(emptyEditorForm())
  }, [])

  const approveAvatar = useCallback(async (athleteId: string) => {
    setSaving(true)
    try {
      const sb = getSupabaseBrowserClient()
      if (!sb) throw new Error('Supabase is not configured.')
      const { data: res, error } = await sb.functions.invoke('admin-athlete-write', {
        body: { action: 'approve-avatar', payload: { athleteId } },
      })
      if (error) throw new Error(error.message)
      if (res?.error) throw new Error(res.error)
      await load()
      showToast('Avatar approved.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Approve failed.', 'default')
    } finally {
      setSaving(false)
    }
  }, [load, showToast])

  const rejectAvatar = useCallback(async (athleteId: string) => {
    setSaving(true)
    try {
      const sb = getSupabaseBrowserClient()
      if (!sb) throw new Error('Supabase is not configured.')
      const { data: res, error } = await sb.functions.invoke('admin-athlete-write', {
        body: { action: 'reject-avatar', payload: { athleteId } },
      })
      if (error) throw new Error(error.message)
      if (res?.error) throw new Error(res.error)
      await load()
      showToast('Avatar rejected.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Reject failed.', 'default')
    } finally {
      setSaving(false)
    }
  }, [load, showToast])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return

    if (!form.displayName.trim()) {
      showToast('Display name is required.', 'default')
      return
    }
    const cc = form.countryCode.trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(cc)) {
      showToast('Country code must be 2 letters.', 'default')
      return
    }

    setSaving(true)
    try {
      const updated = await updateAthlete(editingId, {
        displayName: form.displayName,
        countryCode: cc,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth ? form.dateOfBirth : null,
        faiLicence: form.faiLicence ? form.faiLicence.trim() : null,
        dobDisplayMode: form.dobDisplayMode,
        gdprPublishFullName: form.gdprPublishFullName,
        gdprConsentGiven: form.gdprConsentGiven,
        userId: form.userId.trim() ? form.userId.trim() : null,
      })
      setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)))
      showToast('Athlete updated.', 'success')
      closeEditor()
    } catch (e2) {
      showToast(e2 instanceof Error ? e2.message : 'Update failed.', 'default')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy">Athletes</h1>
      <p className={adminPageDescClass}>
        Athlete list from the database. CRUD will be added in a later phase.
      </p>

      {loading ? (
        <div className="mt-6 space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          {rows.some((a) => Boolean(a.pendingAvatarPath)) ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                Pending avatar approvals on this page
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.filter((a) => Boolean(a.pendingAvatarPath)).map((a) => (
                  <div key={a.id} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900/40 dark:bg-slate-900/70">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        {pendingPreview[a.id] ? (
                          <img src={pendingPreview[a.id] || ''} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {cleanAthleteName(a.displayName)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Submitted {a.pendingAvatarUpdatedAt ? new Date(a.pendingAvatarUpdatedAt).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                        disabled={saving}
                        onClick={() => void approveAvatar(a.id)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-950/40"
                        disabled={saving}
                        onClick={() => void rejectAvatar(a.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-[min(100%,22rem)]">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Search
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(adminFormControlClassNoMt(), 'mt-1 rounded-xl')}
                placeholder="Name (e.g. Abdulaziz Ahmed)"
                autoComplete="off"
              />
            </label>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{rows.length}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span>
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
              No athletes match your search.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-600">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <tr
                      key={a.id}
                      className={i % 2 === 1 ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900/80'}
                    >
                      <td className="px-4 py-3 font-medium text-walar-navy">{cleanAthleteName(a.displayName)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5"><CountryFlag countryCode={a.countryCode} size="sm" /> {a.countryCode}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-walar-navy hover:bg-sky-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                            disabled={saving}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void (async () => {
                                const ok = window.confirm(
                                  'Delete this athlete permanently?\n\nThis also deletes their results (cascade).',
                                )
                                if (!ok) return
                                setSaving(true)
                                try {
                                  await deleteAthlete(a.id)
                                  await load()
                                  showToast('Athlete deleted.', 'success')
                                  if (editingId === a.id) closeEditor()
                                } catch (e) {
                                  showToast(e instanceof Error ? e.message : 'Delete failed.', 'default')
                                } finally {
                                  setSaving(false)
                                }
                              })()
                            }}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-950/40"
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page <span className="font-semibold text-slate-700 dark:text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                disabled={saving || loading || page <= 1}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                disabled={saving || loading || page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {editorOpen && editingId && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close dialog"
            onClick={closeEditor}
            disabled={saving}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="athlete-editor-title"
            className="relative z-[1] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900/95 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
              <h2
                id="athlete-editor-title"
                className="font-display text-lg font-bold text-walar-navy dark:text-slate-100"
              >
                Edit athlete
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={saving}
              >
                Close
              </button>
            </div>

            <form
              className="mt-4 space-y-5"
              onSubmit={(e) => void onSave(e)}
            >
              <div>
                <label className={adminFormLabelClass} htmlFor="athlete-name">
                  Display name
                </label>
                <input
                  id="athlete-name"
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  disabled={saving}
                  required
                  placeholder="e.g. Khalid Shajea"
                />
              </div>

              <div>
                <label className={adminFormLabelClass} htmlFor="athlete-country">
                  Country code
                </label>
                <input
                  id="athlete-country"
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                  value={form.countryCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))
                  }
                  disabled={saving}
                  required
                  maxLength={2}
                  placeholder="e.g. QATAR"
                />
                <p className={cn(adminFormHintClass, 'mt-1')}>
                  Use 2-letter ISO code (e.g. HR, IT, DE).
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={adminFormLabelClass} htmlFor="athlete-gender">
                  Gender
                  <select
                    id="athlete-gender"
                    className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                    value={form.gender}
                    disabled={saving}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as 'M' | 'F' }))}
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </label>

                <label className={adminFormLabelClass} htmlFor="athlete-dob">
                  Date of birth
                  <input
                    id="athlete-dob"
                    type="date"
                    className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                    value={form.dateOfBirth}
                    disabled={saving}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  />
                </label>
              </div>

              <div>
                <label className={adminFormLabelClass} htmlFor="athlete-dob-display">
                  Public DOB display
                </label>
                <select
                  id="athlete-dob-display"
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                  value={form.dobDisplayMode}
                  disabled={saving}
                  onChange={(e) => setForm((f) => ({ ...f, dobDisplayMode: e.target.value as 'age' | 'date' }))}
                >
                  <option value="age">Age only (e.g. 24 yrs)</option>
                  <option value="date">Exact date (e.g. 21.10.2001)</option>
                </select>
                <p className={cn(adminFormHintClass, 'mt-1')}>
                  Affects how the DOB is shown on the public athlete page.
                </p>
              </div>

              <div>
                <label className={adminFormLabelClass} htmlFor="athlete-fai-licence">
                  FAI licence
                </label>
                <input
                  id="athlete-fai-licence"
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                  value={form.faiLicence}
                  disabled={saving}
                  onChange={(e) => setForm((f) => ({ ...f, faiLicence: e.target.value }))}
                  placeholder="May be empty"
                />
                <p className={cn(adminFormHintClass, 'mt-1')}>
                  Used for strict ranking policy when Settings toggle is Off.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={cn(adminFormLabelClass, 'flex items-center gap-3')}>
                  <input
                    type="checkbox"
                    checked={form.gdprPublishFullName}
                    disabled={saving}
                    onChange={(e) => setForm((f) => ({ ...f, gdprPublishFullName: e.target.checked }))}
                  />
                  Publish full name publicly
                </label>

                <label className={cn(adminFormLabelClass, 'flex items-center gap-3')}>
                  <input
                    type="checkbox"
                    checked={form.gdprConsentGiven}
                    disabled={saving}
                    onChange={(e) => setForm((f) => ({ ...f, gdprConsentGiven: e.target.checked }))}
                  />
                  Consent given (eligible for ranking)
                </label>
              </div>

              <div className="pt-2">
                <label className={adminFormLabelClass} htmlFor="athlete-user-id">
                  Linked account (auth user id)
                </label>
                <input
                  id="athlete-user-id"
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5 font-mono')}
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                  disabled={saving}
                  placeholder="UUID from Supabase Auth users (optional)"
                />
                <p className={cn(adminFormHintClass, 'mt-1')}>
                  Set to the user&apos;s UUID to enable self-edit at <strong>/account</strong>. Leave empty to unlink.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className={cn(adminPrimaryButtonClass)} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              After editing, you usually need <strong>Admin → Ranking → Recalculate all</strong> to update points
              that depend on age/date/gender.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
