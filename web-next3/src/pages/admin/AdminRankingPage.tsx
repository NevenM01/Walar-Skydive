import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../hooks/useToast'
import {
  adminFormLabelClass,
  adminPageDescClass,
  adminPrimaryButtonClass,
  adminTealButtonClass,
} from '../../lib/adminFormClasses'
import { cn } from '../../lib/cn'
import { getCompetitionsForAdmin } from '../../lib/api'
import type { Competition } from '../../types'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../../lib/supabaseClient'

const selectCls =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export default function AdminRankingPage() {
  const { showToast } = useToast()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [lastAllCount, setLastAllCount] = useState<number | null>(null)

  const loadComps = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    try {
      const list = await getCompetitionsForAdmin()
      setCompetitions(list)
    } catch {
      setCompetitions([])
    }
  }, [])

  useEffect(() => {
    void loadComps()
  }, [loadComps])

  async function recalcOne() {
    if (!isSupabaseConfigured()) {
      showToast('Configure Supabase in .env.local.', 'default')
      return
    }
    if (!selectedId) {
      showToast('Choose a competition.', 'default')
      return
    }
    const client = getSupabaseBrowserClient()
    if (!client) return

    setBusy(true)
    try {
      const { data: result, error } = await client.functions.invoke('admin-settings-write', {
        body: { action: 'recalc-one', payload: { competition_id: selectedId } },
      })
      if (error) throw error
      if (result?.error) throw new Error(result.error)
      showToast('Competition recalculated.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Recalculate failed.', 'default')
    } finally {
      setBusy(false)
    }
  }

  async function recalcAll() {
    if (!isSupabaseConfigured()) {
      showToast('Configure Supabase in .env.local.', 'default')
      return
    }
    const client = getSupabaseBrowserClient()
    if (!client) return

    const ok = window.confirm(
      'Recalculate all competitions?\n\nThis can take a while on large datasets and will overwrite computed fields.',
    )
    if (!ok) return

    setBusy(true)
    try {
      const { data: result, error } = await client.functions.invoke('admin-settings-write', {
        body: { action: 'recalc-all', payload: {} },
      })
      if (error) throw error
      if (result?.error) throw new Error(result.error)
      const n = typeof result?.data === 'number' ? result.data : Number(result?.data)
      setLastAllCount(Number.isFinite(n) ? n : null)
      showToast(
        Number.isFinite(n) ? `Recalculated ${n} competition(s) with results.` : 'Full recalculation finished.',
        'success',
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Recalculate failed.', 'default')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy dark:text-slate-100">Ranking</h1>
      <p className={adminPageDescClass}>
        Recalculate computed ranking fields after imports, fixes, or rule changes.
      </p>

      <div className="mt-6 space-y-4">
        <div
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] sm:p-6"
          role="note"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            When to use
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <li>After importing results (CSV/XLSX).</li>
            <li>After fixing data (competition dates, ranks, GDPR flags).</li>
            <li>After rule changes (points formulas / rating logic).</li>
          </ul>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            This recomputes <strong>walar_rating</strong>, <strong>rank_points</strong>,{' '}
            <strong>results_points</strong>, and <strong>wal_ar_score</strong> for result rows.
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Requires an admin session and migrations with{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">walar_admin_*</code> RPCs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Option A
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-walar-navy dark:text-slate-100">
              One competition
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Recommended after editing a single event or re-importing one competition.
            </p>
            <label className={cn(adminFormLabelClass, 'mt-5 block')}>
              Competition
              <select
                className={selectCls}
                disabled={busy || !isSupabaseConfigured()}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">— Select —</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.startDate})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !selectedId || !isSupabaseConfigured()}
              className={cn(adminTealButtonClass, 'mt-5')}
              onClick={() => void recalcOne()}
            >
              {busy ? 'Working…' : 'Recalculate this competition'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Option B
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-walar-navy dark:text-slate-100">
              All competitions
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Use after rule changes or large imports. Runs recalculation for every competition that has at least one row
              in{' '}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">competition_results</code>.
            </p>
            {lastAllCount != null && (
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                Last run: <strong>{lastAllCount}</strong> competition(s).
              </p>
            )}
            <button
              type="button"
              disabled={busy || !isSupabaseConfigured()}
              className={cn(adminPrimaryButtonClass, 'mt-4')}
              onClick={() => void recalcAll()}
            >
              {busy ? 'Working…' : 'Recalculate all'}
            </button>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              You will be asked to confirm before running this.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
