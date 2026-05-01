import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Athlete, Competition, LeaderboardFilters, LeaderboardRow } from '../types'
import { getEvents, getLeaderboardPage } from '../lib/api'
import { FilterPanel } from '../components/leaderboard/FilterPanel'
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable'
import { ErrorMessage } from '../components/shared/ErrorMessage'

const DEFAULT_FILTERS: LeaderboardFilters = {
  category: 'all',
  window: '5y',
  faiClass: 'all',
  gender: 'all',
  licence: 'all',
  competitionId: null,
}

const PAGE_SIZE = 100

export default function ResultsPage() {
  const [filters,  setFilters]  = useState<LeaderboardFilters>(DEFAULT_FILTERS)
  const [rows,     setRows]     = useState<LeaderboardRow[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [events,   setEvents]   = useState<Competition[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [athleteNameQuery, setAthleteNameQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(athleteNameQuery), 300)
    return () => clearTimeout(t)
  }, [athleteNameQuery])

  const athleteMap = useMemo(
    () => new Map(athletes.map((a) => [a.id, a])),
    [athletes],
  )

  const nameQ = debouncedQuery.trim().toLowerCase()

  const filteredRows = useMemo(() => {
    if (!nameQ) return rows
    return rows.filter((row) =>
      athleteMap.get(row.athleteId)?.displayName.toLowerCase().includes(nameQ),
    )
  }, [rows, athleteMap, nameQ])

  const loadLeaderboard = useCallback(async (f: LeaderboardFilters, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const lb = await getLeaderboardPage(f, { page: p, pageSize: PAGE_SIZE })
      setRows(lb.rows)
      setAthletes(lb.athletes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ranking.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [page])

  useEffect(() => { void loadLeaderboard(filters, page) }, [filters, page, loadLeaderboard])

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {})
  }, [])

  const hasNextPage = useMemo(() => rows.length === PAGE_SIZE, [rows.length])

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 md:mb-10"
      >
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">World Ranking</p>
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter text-[var(--text-col)] leading-none mb-3">
          WALAR Leaderboard
        </h1>
        <p className="text-base text-[var(--muted)] max-w-[52ch]">
          Cumulative scores from all official WALAR competitions. Filter by time window and gender, or use the search box
          to find an athlete by name (official rank is unchanged).
        </p>
      </motion.div>

      {/* Filters */}
      <div className="mb-8 pb-6 border-b border-[var(--border-col)]">
        <FilterPanel
          filters={filters}
          events={events}
          athleteNameQuery={athleteNameQuery}
          onAthleteNameQueryChange={setAthleteNameQuery}
          onChange={setFilters}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => loadLeaderboard(filters, page)} />
        </div>
      )}

      {/* Count label */}
      {!loading && !error && rows.length > 0 && (
        <p className="text-xs text-[var(--muted)] font-display mb-4 tabular">
          {nameQ ? (
            <>
              Showing {filteredRows.length} of {rows.length} {rows.length === 1 ? 'athlete' : 'athletes'}
            </>
          ) : (
            <>
              Showing {rows.length} {rows.length === 1 ? 'athlete' : 'athletes'} (page {page})
            </>
          )}
        </p>
      )}

      {/* Table */}
      <LeaderboardTable
        rows={filteredRows}
        athletes={athletes}
        loading={loading}
        emptyTitle={nameQ && rows.length > 0 ? 'No name match' : undefined}
        emptyDescription={
          nameQ && rows.length > 0
            ? 'No athlete in this ranking matches your search. Try another spelling or clear the search.'
            : undefined
        }
      />

      {/* Pagination */}
      {!loading && !error ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)] font-display tabular">
            Page {page} · Showing {rows.length} (max {PAGE_SIZE})
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-col)] shadow-sm hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-col)] shadow-sm hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasNextPage}
              title={!hasNextPage ? 'No more results' : undefined}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
