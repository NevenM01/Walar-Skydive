import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { cn } from '../../lib/cn'
import { useToast } from '../../hooks/useToast'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  adminFormControlClassNoMt,
  adminPageDescClass,
  adminPrimaryButtonClass,
} from '../../lib/adminFormClasses'
import {
  approveProfileEditRequest,
  fetchIdDocumentSignedUrl,
  fetchProfileEditRequestsFromSupabase,
  rejectProfileEditRequest,
  type ProfileEditRequestRow,
  type ProfileEditRequestStatus,
} from '../../lib/adminProfileEditRequestsFromSupabase'
import { fetchAthletesPageFromSupabase } from '../../lib/athletesFromSupabase'

const PAGE_SIZE = 30

type AthletePick = Pick<Athlete, 'id' | 'displayName' | 'countryCode'>

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function formatDt(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString()
}

export default function AdminProfileRequestsPage() {
  const { showToast } = useToast()

  const [status, setStatus] = useState<ProfileEditRequestStatus | 'all'>('pending')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<ProfileEditRequestRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsRow, setDetailsRow] = useState<ProfileEditRequestRow | null>(null)
  const [detailsIdDocUrl, setDetailsIdDocUrl] = useState<string | null>(null)
  const [detailsLoadingDoc, setDetailsLoadingDoc] = useState(false)

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const offset = (page - 1) * PAGE_SIZE
      const res = await fetchProfileEditRequestsFromSupabase({ status, offset, limit: PAGE_SIZE })
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load requests.', 'default')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, showToast, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [status])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [active, setActive] = useState<ProfileEditRequestRow | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [resolvedAthleteId, setResolvedAthleteId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [mode, setMode] = useState<'approve' | 'reject'>('approve')
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null)

  const [athleteQuery, setAthleteQuery] = useState('')
  const debouncedAthleteQuery = useDebouncedValue(athleteQuery, 300)
  const [athleteOptions, setAthleteOptions] = useState<AthletePick[]>([])
  const [searchingAthletes, setSearchingAthletes] = useState(false)

  useEffect(() => {
    const q = debouncedAthleteQuery.trim()
    if (q.length < 2 || !dialogOpen || mode !== 'approve') {
      setAthleteOptions([])
      return
    }
    let cancelled = false
    setSearchingAthletes(true)
    void (async () => {
      try {
        const { rows: aRows } = await fetchAthletesPageFromSupabase({ query: q, offset: 0, limit: 10 })
        if (cancelled) return
        setAthleteOptions(aRows.map((a) => ({ id: a.id, displayName: a.displayName, countryCode: a.countryCode })))
      } catch {
        if (!cancelled) setAthleteOptions([])
      } finally {
        if (!cancelled) setSearchingAthletes(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedAthleteQuery, dialogOpen, mode])

  const openApprove = useCallback((r: ProfileEditRequestRow) => {
    setMode('approve')
    setActive(r)
    setInviteEmail(r.email ?? '')
    setResolvedAthleteId(r.resolved_athlete_id ?? r.athlete_id ?? '')
    setRejectReason('')
    setIdDocUrl(null)
    setAthleteQuery('')
    setAthleteOptions([])
    setDialogOpen(true)
  }, [])

  const openReject = useCallback((r: ProfileEditRequestRow) => {
    setMode('reject')
    setActive(r)
    setInviteEmail(r.email ?? '')
    setResolvedAthleteId(r.resolved_athlete_id ?? r.athlete_id ?? '')
    setRejectReason('')
    setIdDocUrl(null)
    setAthleteQuery('')
    setAthleteOptions([])
    setDialogOpen(true)
  }, [])

  const openDetails = useCallback((r: ProfileEditRequestRow) => {
    setDetailsRow(r)
    setDetailsIdDocUrl(null)
    setDetailsLoadingDoc(false)
    setDetailsOpen(true)
    if (!r.id_document_path) return
    setDetailsLoadingDoc(true)
    void (async () => {
      try {
        const url = await fetchIdDocumentSignedUrl(r.id_document_path as string)
        setDetailsIdDocUrl(url)
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Failed to load ID document preview.', 'default')
      } finally {
        setDetailsLoadingDoc(false)
      }
    })()
  }, [showToast])

  const closeDetails = useCallback(() => {
    if (saving) return
    setDetailsOpen(false)
    setDetailsRow(null)
    setDetailsIdDocUrl(null)
    setDetailsLoadingDoc(false)
  }, [saving])

  const closeDialog = useCallback(() => {
    if (saving) return
    setDialogOpen(false)
    setActive(null)
    setIdDocUrl(null)
  }, [saving])

  const onApprove = useCallback(async () => {
    if (!active) return
    if (!resolvedAthleteId.trim()) {
      showToast('Resolved athlete id is required.', 'default')
      return
    }
    setSaving(true)
    try {
      await approveProfileEditRequest({
        requestId: active.id,
        resolvedAthleteId: resolvedAthleteId.trim(),
        inviteEmail: inviteEmail.trim() || active.email,
      })
      showToast('Request approved. Invite sent (or existing user linked).', 'success')
      closeDialog()
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Approve failed.', 'default')
    } finally {
      setSaving(false)
    }
  }, [active, closeDialog, inviteEmail, load, resolvedAthleteId, showToast])

  const onReject = useCallback(async () => {
    if (!active) return
    setSaving(true)
    try {
      await rejectProfileEditRequest({
        requestId: active.id,
        reason: rejectReason.trim() || null,
      })
      showToast('Request rejected.', 'success')
      closeDialog()
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Reject failed.', 'default')
    } finally {
      setSaving(false)
    }
  }, [active, closeDialog, load, rejectReason, showToast])

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy dark:text-slate-100">Profile edit requests</h1>
      <p className={adminPageDescClass}>
        Requests submitted by users who want to edit an athlete profile. Approving sends an invite and links{' '}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">athletes.user_id</code>.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-[min(100%,16rem)]">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProfileEditRequestStatus | 'all')}
            className={cn(adminFormControlClassNoMt(), 'mt-1 rounded-xl')}
            disabled={loading || saving}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </label>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{rows.length}</span> of{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span>
        </p>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
          No requests in this filter.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-600">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Athlete</th>
                <th className="px-4 py-3">Manual</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={i % 2 === 1 ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900/80'}
                >
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDt(r.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-walar-navy dark:text-slate-100">{r.email}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div className="space-y-0.5">
                      <p className="font-mono text-xs">{r.athlete_id ?? '—'}</p>
                      {r.athlete_search_text ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.athlete_search_text}</p>
                      ) : null}
                      {r.resolved_athlete_id ? (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Resolved: <span className="font-mono">{r.resolved_athlete_id}</span>
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div className="space-y-0.5">
                      <p className="text-xs">{r.manual_full_name ?? '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[
                          r.manual_country_code ? `CC:${r.manual_country_code}` : null,
                          r.manual_fai_licence ? `FAI:${r.manual_fai_licence}` : null,
                          r.manual_year_of_birth != null ? `YOB:${r.manual_year_of_birth}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                        r.status === 'pending'
                          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100'
                          : r.status === 'approved'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100'
                            : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100',
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/70"
                        disabled={saving}
                        onClick={() => openDetails(r)}
                      >
                        View
                      </button>
                      {r.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                            disabled={saving}
                            onClick={() => openApprove(r)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-950/40"
                            disabled={saving}
                            onClick={() => openReject(r)}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
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

      {dialogOpen && active ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close dialog"
            onClick={closeDialog}
            disabled={saving}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[1] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900/95 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
              <h2 className="font-display text-lg font-bold text-walar-navy dark:text-slate-100">
                {mode === 'approve' ? 'Approve request' : 'Reject request'}
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={saving}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
                  <input
                    className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                    value={inviteEmail}
                    disabled={saving}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Request id</span>
                  <input className={cn(adminFormControlClassNoMt(), 'mt-1.5 font-mono')} value={active.id} readOnly />
                </label>
              </div>

              {mode === 'approve' ? (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Resolved athlete id</span>
                    <input
                      className={cn(adminFormControlClassNoMt(), 'mt-1.5 font-mono')}
                      value={resolvedAthleteId}
                      disabled={saving}
                      onChange={(e) => setResolvedAthleteId(e.target.value)}
                      placeholder="uuid"
                    />
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Search athlete to fill id</p>
                    <input
                      className={cn(adminFormControlClassNoMt(), 'mt-3')}
                      value={athleteQuery}
                      disabled={saving}
                      onChange={(e) => setAthleteQuery(e.target.value)}
                      placeholder="Type at least 2 characters…"
                      autoComplete="off"
                    />
                    {searchingAthletes ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Searching…</p>
                    ) : athleteOptions.length ? (
                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60">
                        {athleteOptions.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            disabled={saving}
                            onClick={() => setResolvedAthleteId(a.id)}
                            className="w-full px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/70"
                          >
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{a.displayName}</span>{' '}
                            <span className="text-slate-500 dark:text-slate-400">({a.countryCode})</span>
                            <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">{a.id}</span>
                          </button>
                        ))}
                      </div>
                    ) : debouncedAthleteQuery.trim().length >= 2 ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No matches.</p>
                    ) : null}
                  </div>

                  {active.id_document_path ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">ID document</p>
                      <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {active.id_document_path}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            void (async () => {
                              try {
                                setSaving(true)
                                const url = await fetchIdDocumentSignedUrl(active.id_document_path as string)
                                setIdDocUrl(url)
                                window.open(url, '_blank', 'noopener,noreferrer')
                              } catch (e) {
                                showToast(e instanceof Error ? e.message : 'Failed to open ID document.', 'default')
                              } finally {
                                setSaving(false)
                              }
                            })()
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Open (signed URL)
                        </button>
                        {idDocUrl ? (
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">Signed URL created.</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Rejection reason (optional)</span>
                  <textarea
                    className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                    value={rejectReason}
                    disabled={saving}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Short explanation…"
                  />
                </label>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void (mode === 'approve' ? onApprove() : onReject())}
                className={cn(adminPrimaryButtonClass, mode === 'reject' ? 'bg-rose-700 hover:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-500' : '')}
                disabled={saving}
              >
                {saving ? 'Working…' : mode === 'approve' ? 'Approve & invite' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsOpen && detailsRow ? (
        <div className="fixed inset-0 z-[210] flex items-end justify-center p-4 sm:items-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close details"
            onClick={closeDetails}
            disabled={saving}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[1] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900/95 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
              <div>
                <h2 className="font-display text-lg font-bold text-walar-navy dark:text-slate-100">Request details</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {detailsRow.status} · {formatDt(detailsRow.created_at)} · <span className="font-mono">{detailsRow.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={saving}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email</p>
                  <p className="mt-1 font-mono text-sm text-slate-700 dark:text-slate-200">{detailsRow.email}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Athlete selection</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p>
                      <span className="text-slate-500 dark:text-slate-400">athlete_id:</span>{' '}
                      <span className="font-mono">{detailsRow.athlete_id ?? '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 dark:text-slate-400">search text:</span>{' '}
                      <span>{detailsRow.athlete_search_text ?? '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 dark:text-slate-400">resolved:</span>{' '}
                      <span className="font-mono">{detailsRow.resolved_athlete_id ?? '—'}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Manual details</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    <p>
                      <span className="text-slate-500 dark:text-slate-400">full name:</span>{' '}
                      <span>{detailsRow.manual_full_name ?? '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 dark:text-slate-400">country code:</span>{' '}
                      <span>{detailsRow.manual_country_code ?? '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 dark:text-slate-400">FAI licence:</span>{' '}
                      <span>{detailsRow.manual_fai_licence ?? '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 dark:text-slate-400">year of birth:</span>{' '}
                      <span>{detailsRow.manual_year_of_birth ?? '—'}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Message</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {detailsRow.message?.trim() ? detailsRow.message : '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">ID document</p>
                {detailsRow.id_document_path ? (
                  <>
                    <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{detailsRow.id_document_path}</p>
                    <div className="mt-3">
                      {detailsLoadingDoc ? (
                        <Skeleton className="h-[360px] w-full rounded-xl" />
                      ) : detailsIdDocUrl ? (
                        <a href={detailsIdDocUrl} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={detailsIdDocUrl}
                            alt="ID document preview"
                            className="h-[360px] w-full rounded-xl border border-slate-200 object-contain bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Preview unavailable.</p>
                      )}
                    </div>
                    {detailsIdDocUrl ? (
                      <div className="mt-3">
                        <a
                          href={detailsIdDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Open full image
                        </a>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">—</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

