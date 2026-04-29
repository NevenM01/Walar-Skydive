import { MagnifyingGlass } from '@phosphor-icons/react'
import type { Competition, LeaderboardFilters } from '../../types'

interface FilterPanelProps {
  filters: LeaderboardFilters
  events: Competition[]
  athleteNameQuery: string
  onAthleteNameQueryChange: (value: string) => void
  onChange: (f: LeaderboardFilters) => void
}

const GENDER_OPTIONS = [
  { value: 'all', label: 'All athletes' },
  { value: 'M',   label: 'Men' },
  { value: 'F',   label: 'Women' },
]

const WINDOW_OPTIONS = [
  { value: '5y',        label: '5-year window' },
  { value: '52w',       label: 'Last 52 weeks' },
  { value: 'season2025', label: 'Season 2025' },
]

const LICENCE_OPTIONS = [
  { value: 'all',      label: 'All athletes' },
  { value: 'fai_only', label: 'FAI licence only' },
]

const selectCls =
  'w-full h-9 px-3 rounded-xl border border-[var(--border-col)] bg-[var(--surface)] text-sm text-[var(--text-col)] font-display focus:outline-none focus:border-[var(--accent)] transition-colors duration-150 cursor-pointer appearance-none'

const searchInputCls =
  'w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--border-col)] bg-[var(--surface)] text-sm text-[var(--text-col)] font-display placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors duration-150'

export function FilterPanel({ filters, events, athleteNameQuery, onAthleteNameQueryChange, onChange }: FilterPanelProps) {
  const completedEvents = events.filter(e =>
    e.status === 'completed' || e.status === 'results_published'
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Athlete name search */}
      <div className="relative w-full min-w-0 sm:flex-1 sm:min-w-[12rem] sm:max-w-md">
        <MagnifyingGlass
          size={18}
          weight="bold"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={athleteNameQuery}
          onChange={(e) => onAthleteNameQueryChange(e.target.value)}
          placeholder="Search by athlete name…"
          autoComplete="off"
          spellCheck={false}
          className={searchInputCls}
          aria-label="Search athletes by name"
        />
      </div>

      {/* Gender */}
      <div className="relative w-full min-w-0 sm:w-40">
        <select
          value={filters.gender}
          onChange={e => onChange({ ...filters, gender: e.target.value as LeaderboardFilters['gender'], competitionId: null })}
          className={selectCls}
        >
          {GENDER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Window */}
      <div className="relative w-full min-w-0 sm:w-44">
        <select
          value={filters.window}
          onChange={e => onChange({ ...filters, window: e.target.value, competitionId: null })}
          className={selectCls}
        >
          {WINDOW_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Licence */}
      <div className="relative w-full min-w-0 sm:w-44">
        <select
          value={filters.licence}
          onChange={e => onChange({ ...filters, licence: e.target.value as LeaderboardFilters['licence'] })}
          className={selectCls}
        >
          {LICENCE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Single event */}
      <div className="relative w-full min-w-0 sm:w-52">
        <select
          value={filters.competitionId ?? ''}
          onChange={e => onChange({ ...filters, competitionId: e.target.value || null })}
          className={selectCls}
        >
          <option value="">All competitions</option>
          {completedEvents.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
