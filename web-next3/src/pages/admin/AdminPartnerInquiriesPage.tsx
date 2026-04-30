import { useCallback, useEffect, useMemo, useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/cn'
import { adminPageDescClass } from '../../lib/adminFormClasses'
import {
  deletePartnerInquiryFromSupabase,
  fetchPartnerInquiriesFromSupabase,
  type PartnerInquiryRow,
} from '../../lib/adminPartnerInquiriesFromSupabase'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

const PAGE_SIZE = 25

function formatDt(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString()
}

function truncate(s: string | null, max: number): string {
  if (!s) return '—'
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export default function AdminPartnerInquiriesPage() {
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<PartnerInquiryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [active, setActive] = useState<PartnerInquiryRow | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([])
      setTotal(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const offset = (page - 1) * PAGE_SIZE
      const res = await fetchPartnerInquiriesFromSupabase({ offset, limit: PAGE_SIZE })
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load partner inquiries.', 'default')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, showToast])

  useEffect(() => {
    void load()
  }, [load])

  const openDetails = useCallback((r: PartnerInquiryRow) => {
    setActive(r)
    setDetailsOpen(true)
  }, [])

  const closeDetails = useCallback(() => {
    if (saving) return
    setDetailsOpen(false)
    setActive(null)
  }, [saving])

  const onDelete = useCallback(
    async (r: PartnerInquiryRow) => {
      const ok = window.confirm(
        `Delete this inquiry from ${r.organization_name}?\n\nThis removes the row permanently.`,
      )
      if (!ok) return
      setSaving(true)
      try {
        await deletePartnerInquiryFromSupabase(r.id)
        showToast('Inquiry deleted.', 'success')
        if (active?.id === r.id) closeDetails()
        await load()
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Delete failed.', 'default')
      } finally {
        setSaving(false)
      }
    },
    [active?.id, closeDetails, load, showToast],
  )

  const configured = isSupabaseConfigured()

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy dark:text-slate-100">Partner inquiries</h1>
      <p className={adminPageDescClass}>
        Submissions from the public <strong className="font-semibold">Become a partner</strong> form (
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/partners/become-a-partner</code>). Admins can
        review contact details here; responding by email is outside this app.
      </p>

      {!configured ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
          Supabase is not configured — inquiry list is unavailable.
        </p>
      ) : null}

      {configured ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{rows.length}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span>
          </p>
        </div>
      ) : null}

      {configured && loading ? (
        <div className="mt-6 space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : null}

      {configured && !loading && rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
          No inquiries yet. When organisations submit the form, rows appear here.
        </p>
      ) : null}

      {configured && !loading && rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-600">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={i % 2 === 1 ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900/80'}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                    {formatDt(r.created_at)}
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 font-medium text-walar-navy dark:text-slate-100">
                    {r.organization_name}
                  </td>
                  <td className="max-w-[12rem] px-4 py-3 text-slate-700 dark:text-slate-200">{r.contact_name}</td>
                  <td className="max-w-[14rem] px-4 py-3">
                    <a href={`mailto:${r.email}`} className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300">
                      {r.email}
                    </a>
                  </td>
                  <td className="max-w-[10rem] px-4 py-3 text-slate-600 dark:text-slate-300">
                    {r.phone ? (
                      <a
                        href={`tel:${r.phone.replace(/\s+/g, '')}`}
                        className="text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                      >
                        {r.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[16rem] px-4 py-3 text-slate-600 dark:text-slate-300">
                    {truncate(r.message, 72)}
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
                      <button
                        type="button"
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-950/40"
                        disabled={saving}
                        onClick={() => void onDelete(r)}
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
      ) : null}

      {configured && !loading && total > 0 ? (
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
      ) : null}

      {detailsOpen && active ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close dialog"
            onClick={closeDetails}
            disabled={saving}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[1] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900/95 sm:max-w-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
              <div>
                <h2 className="font-display text-lg font-bold text-walar-navy dark:text-slate-100">
                  {active.organization_name}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDt(active.created_at)}</p>
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

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Contact
                </dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-100">{active.contact_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Email
                </dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${active.email}`} className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300">
                    {active.email}
                  </a>
                </dd>
              </div>
              {active.phone ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Phone
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${active.phone.replace(/\s+/g, '')}`}
                      className="text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                    >
                      {active.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Message
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100">
                  {active.message?.trim() ? active.message : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Row id
                </dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-600 dark:text-slate-300">{active.id}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button
                type="button"
                className={cn(
                  'rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-950/40',
                  saving && 'opacity-60',
                )}
                disabled={saving}
                onClick={() => void onDelete(active)}
              >
                Delete inquiry
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
