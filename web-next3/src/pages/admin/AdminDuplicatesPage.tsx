import { useCallback, useEffect, useMemo, useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/cn'
import { adminPageDescClass, adminPrimaryButtonClass, adminFormControlClassNoMt } from '../../lib/adminFormClasses'
import {
  autoMergeAthletesNameDob,
  autoMergeAthletesNameCore,
  fetchAthleteDuplicatesReport,
  mergeAthletesSafeClearLoserDob,
  type AthleteDuplicateRow,
} from '../../lib/athleteDuplicatesFromSupabase'

type GroupKey = string
type Group = { groupType: AthleteDuplicateRow['group_type']; groupKey: string; rows: AthleteDuplicateRow[] }

function formatDt(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString()
}

export default function AdminDuplicatesPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<AthleteDuplicateRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AthleteDuplicateRow['group_type'] | 'all'>('all')
  const [query, setQuery] = useState('')
  const [autoMerging, setAutoMerging] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchAthleteDuplicatesReport())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load duplicates report.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const r of rows) {
      const k = `${r.group_type}:${r.group_key}`
      const g = map.get(k)
      if (g) g.rows.push(r)
      else map.set(k, { groupType: r.group_type, groupKey: r.group_key, rows: [r] })
    }
    return Array.from(map.values()).sort((a, b) => (a.groupType === b.groupType ? a.groupKey.localeCompare(b.groupKey) : a.groupType.localeCompare(b.groupType)))
  }, [rows])

  const groupOptions = useMemo(() => {
    return groups.map((g) => ({
      id: `${g.groupType}:${g.groupKey}`,
      label: `${g.groupType.toUpperCase()} · ${g.groupKey} (${g.rows.length})`,
    }))
  }, [groups])

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups.filter((g) => {
      if (typeFilter !== 'all' && g.groupType !== typeFilter) return false
      if (selectedGroup !== 'all' && `${g.groupType}:${g.groupKey}` !== selectedGroup) return false
      if (!q) return true
      const hay = [
        g.groupType,
        g.groupKey,
        ...g.rows.flatMap((r) => [
          r.display_name,
          r.fai_licence ?? '',
          r.country_code ?? '',
          r.id,
          r.user_id ?? '',
          r.date_of_birth ?? '',
        ]),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [groups, query, selectedGroup, typeFilter])

  const defaultWinnerId = useCallback((g: Group) => {
    // Prefer user_id, then FAI, then real country (not XX/XXX), then results_count, then oldest created_at.
    const sorted = [...g.rows].sort((a, b) => {
      const au = a.user_id ? 1 : 0
      const bu = b.user_id ? 1 : 0
      if (au !== bu) return bu - au
      const af = a.fai_licence && a.fai_licence.trim() ? 1 : 0
      const bf = b.fai_licence && b.fai_licence.trim() ? 1 : 0
      if (af !== bf) return bf - af
      const ac = a.country_code && !['xx', 'xxx'].includes(a.country_code.trim().toLowerCase()) ? 1 : 0
      const bc = b.country_code && !['xx', 'xxx'].includes(b.country_code.trim().toLowerCase()) ? 1 : 0
      if (ac !== bc) return bc - ac
      if (a.results_count !== b.results_count) return b.results_count - a.results_count
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    return sorted[0]?.id ?? ''
  }, [])

  const [winnerByGroup, setWinnerByGroup] = useState<Record<string, string>>({})

  useEffect(() => {
    // Initialize winner selections once rows load.
    const next: Record<string, string> = {}
    for (const g of groups) {
      const key = `${g.groupType}:${g.groupKey}`
      next[key] = winnerByGroup[key] ?? defaultWinnerId(g)
    }
    setWinnerByGroup(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, defaultWinnerId])

  async function onMerge(g: Group) {
    const key = `${g.groupType}:${g.groupKey}`
    const winnerId = winnerByGroup[key]
    if (!winnerId) {
      showToast('Pick a winner first.', 'default')
      return
    }
    const loserIds = g.rows.map((r) => r.id).filter((id) => id !== winnerId)
    if (loserIds.length === 0) {
      showToast('No losers to merge.', 'default')
      return
    }
    const ok = window.confirm(
      `Merge ${loserIds.length} athlete(s) into winner?\n\nGroup: ${key}\nWinner: ${winnerId}\n\nThis retargets results and deletes loser rows.\n\nIf losers have a different date_of_birth than the winner, their DOB will be cleared (set to NULL) before merge.`,
    )
    if (!ok) return

    setSaving(true)
    try {
      await mergeAthletesSafeClearLoserDob({
        winnerId,
        loserIds,
        reason: `AdminDuplicatesPage: ${key}`,
      })
      showToast('Merged successfully.', 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Merge failed.', 'default')
    } finally {
      setSaving(false)
    }
  }

  async function onAutoMergeNameDob() {
    const ok = window.confirm(
      'Auto-merge all SAFE "Name + DOB" groups?\n\nThis will merge only groups that pass safety checks (max 1 user link, max 1 FAI in group). Loser rows will be deleted.',
    )
    if (!ok) return

    setAutoMerging(true)
    try {
      const res = await autoMergeAthletesNameDob({ groupLimit: 500 })
      showToast(`Auto-merge done. Groups: ${res.merged_groups}, athletes merged: ${res.merged_athletes}, skipped: ${res.skipped_groups}.`, 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Auto-merge failed.', 'default')
    } finally {
      setAutoMerging(false)
    }
  }

  async function onAutoMergeNameCore() {
    const ok = window.confirm(
      'Auto-merge SAFE "Name core" groups?\n\nThis is intended for import artefacts (team suffix in name, placeholder country XX/XXX, junk rows with 0 results).\n\nIt will only merge loser rows that have: no user, no FAI, 0 results. If their DOB conflicts, it will be cleared (set to NULL) before merge.',
    )
    if (!ok) return

    setAutoMerging(true)
    try {
      const res = await autoMergeAthletesNameCore({ groupLimit: 500 })
      showToast(`Auto-merge done. Groups: ${res.merged_groups}, athletes merged: ${res.merged_athletes}, skipped: ${res.skipped_groups}.`, 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Auto-merge failed.', 'default')
    } finally {
      setAutoMerging(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy dark:text-slate-100">Duplicates</h1>
      <p className={adminPageDescClass}>
        Safe-only duplicates report. Prefer merging FAI duplicates. If merge fails, it usually means safety checks blocked it (conflicting DOB or multiple user links).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(14rem,1fr)_minmax(12rem,16rem)_minmax(12rem,22rem)_auto_auto] sm:items-end">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Search (name / FAI / country)
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(adminFormControlClassNoMt(), 'mt-1 rounded-xl')}
            disabled={loading || saving || autoMerging}
            placeholder="e.g. Željko, 71670, CRO"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Type
          </span>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as AthleteDuplicateRow['group_type'] | 'all')
            }
            className={cn(adminFormControlClassNoMt(), 'mt-1 rounded-xl')}
            disabled={loading || saving || autoMerging}
          >
            <option value="all">All</option>
            <option value="fai">FAI</option>
            <option value="fai_mismatch">FAI mismatch (same name+country, different FAI)</option>
            <option value="name_dob">Name + DOB</option>
            <option value="name_country">Name + Country</option>
            <option value="name_core">Name core (XX/XXX, team suffix)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Group
          </span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value as GroupKey | 'all')}
            className={cn(adminFormControlClassNoMt(), 'mt-1 rounded-xl')}
            disabled={loading || saving || autoMerging}
          >
            <option value="all">All groups</option>
            {groupOptions
              .filter((o) => (typeFilter === 'all' ? true : o.id.startsWith(`${typeFilter}:`)))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || saving || autoMerging}
          className={cn(adminPrimaryButtonClass, 'h-11')}
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={() => void onAutoMergeNameDob()}
          disabled={loading || saving || autoMerging}
          className={cn(adminPrimaryButtonClass, 'h-11')}
          title='Auto-merge safe "Name + DOB" groups'
        >
          {autoMerging ? 'Auto-merging…' : 'Auto-merge Name+DOB'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onAutoMergeNameCore()}
          disabled={loading || saving || autoMerging}
          className={cn(adminPrimaryButtonClass, 'h-11')}
          title='Auto-merge safe "name core" groups'
        >
          {autoMerging ? 'Auto-merging…' : 'Auto-merge Name core'}
        </button>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
          No duplicate groups found.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {visibleGroups.map((g) => {
            const key = `${g.groupType}:${g.groupKey}`
            const winnerId = winnerByGroup[key] ?? ''
            return (
              <section key={key} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {g.groupType}
                    </p>
                    <p className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">{g.groupKey}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={winnerId}
                      onChange={(e) => setWinnerByGroup((prev) => ({ ...prev, [key]: e.target.value }))}
                      className={cn(adminFormControlClassNoMt(), 'sm:min-w-[28rem] font-mono')}
                      disabled={saving || autoMerging}
                    >
                      {g.rows.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.id} · results={r.results_count} · user={r.user_id ? 'yes' : 'no'} · dob={r.date_of_birth ?? '—'} · {r.display_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void onMerge(g)}
                      disabled={saving || autoMerging}
                      className={cn(adminPrimaryButtonClass, 'h-11')}
                    >
                      {saving ? 'Working…' : 'Merge'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">id</th>
                        <th className="px-4 py-3">name</th>
                        <th className="px-4 py-3">country</th>
                        <th className="px-4 py-3">dob</th>
                        <th className="px-4 py-3">FAI</th>
                        <th className="px-4 py-3">user</th>
                        <th className="px-4 py-3">results</th>
                        <th className="px-4 py-3">created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r, idx) => (
                        <tr
                          key={r.id}
                          className={idx % 2 === 1 ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900/80'}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{r.id}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{r.display_name}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.country_code}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.date_of_birth ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.fai_licence ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{r.user_id ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.results_count}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDt(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

