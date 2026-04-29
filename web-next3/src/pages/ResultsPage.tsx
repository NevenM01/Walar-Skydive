import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Athlete, Competition, LeaderboardFilters, LeaderboardRow } from '../types'
import { getLeaderboard, getEvents } from '../lib/api'
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

export default function ResultsPage() {
  const [filters,  setFilters]  = useState<LeaderboardFilters>(DEFAULT_FILTERS)
  const [rows,     setRows]     = useState<LeaderboardRow[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [events,   setEvents]   = useState<Competition[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [athleteNameQuery, setAthleteNameQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

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

  const loadLeaderboard = useCallback(async (f: LeaderboardFilters) => {
    setLoading(true)
    setError(null)
    try {
      const lb = await getLeaderboard(f)
      setRows(lb.rows)
      setAthletes(lb.athletes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ranking.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadLeaderboard(filters) }, [filters, loadLeaderboard])

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {})
  }, [])

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
          <ErrorMessage message={error} onRetry={() => loadLeaderboard(filters)} />
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
              {rows.length} {rows.length === 1 ? 'athlete' : 'athletes'} ranked
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
    </div>
  )
}
