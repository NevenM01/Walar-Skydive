import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Medal } from '@phosphor-icons/react'
import type { Athlete, LeaderboardRow } from '../../types'
import { CountryFlag } from '../shared/CountryFlag'
import { SkeletonRow } from '../ui/Skeleton'
import { EmptyState } from '../shared/EmptyState'

interface LeaderboardTableProps {
  rows: LeaderboardRow[]
  athletes: Athlete[]
  loading: boolean
  /** When the table is empty (e.g. name search filtered everything out). */
  emptyTitle?: string
  emptyDescription?: string
}

const STAGGER = {
  visible: { transition: { staggerChildren: 0.04 } },
}

const ROW_VAR = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, x: 12, transition: { duration: 0.25 } },
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1)
    return <Medal size={18} weight="fill" className="text-[var(--accent)]" />
  if (rank === 2)
    return <span className="font-display font-black text-base tabular text-slate-400 dark:text-slate-500">2</span>
  if (rank === 3)
    return (
      <span className="font-display font-black text-base tabular text-[var(--accent-h)] dark:text-[var(--accent)]">
        3
      </span>
    )
  return <span className="font-display font-semibold text-sm tabular text-[var(--muted)]">{rank}</span>
}

function AthleteAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="w-9 h-9 rounded-full object-cover border border-[var(--border-col)] bg-[var(--bg)] shrink-0"
        loading="lazy"
      />
    )
  }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border border-[var(--border-col)] flex items-center justify-center shrink-0">
      <span className="text-xs font-display font-bold text-[var(--muted)]">{initials}</span>
    </div>
  )
}

export function LeaderboardTable({
  rows,
  athletes,
  loading,
  emptyTitle = 'No ranking data',
  emptyDescription = 'No athletes match the current filters. Try adjusting the gender or time window.',
}: LeaderboardTableProps) {
  if (loading) {
    return (
      <div>
        {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="visible"
      className="divide-y-2 divide-[var(--row-divider)]"
    >
      <AnimatePresence mode="popLayout">
        {rows.map(row => {
          const athlete = athletes.find(a => a.id === row.athleteId)
          if (!athlete) return null
          return (
            <motion.div
              key={row.athleteId}
              variants={ROW_VAR}
              layout
              layoutId={row.athleteId}
              className="flex items-center gap-4 py-3.5 hover:bg-[var(--surface)] transition-colors duration-150 -mx-4 px-4 md:-mx-6 md:px-6 rounded-xl group"
            >
              {/* Rank */}
              <div className="w-6 flex items-center justify-center shrink-0">
                <RankDisplay rank={row.rank} />
              </div>

              {/* Avatar */}
              <AthleteAvatar name={athlete.displayName} avatarUrl={athlete.avatarUrl} />

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/athlete/${athlete.id}`}
                  className="font-display font-semibold text-sm text-[var(--text-col)] hover:text-[var(--accent)] transition-colors duration-150 truncate block"
                >
                  {athlete.displayName}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  {athlete.countryCode && (
                    <CountryFlag countryCode={athlete.countryCode} size="sm" />
                  )}
                  <span className="text-xs text-[var(--muted)]">
                    {row.eventsCount} {row.eventsCount === 1 ? 'event' : 'events'}
                    {row.bestRoundCm !== null && ` · best ${row.bestRoundCm} cm`}
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right shrink-0">
                <span className={`font-display font-black text-base tabular ${row.rank <= 3 ? 'text-[var(--accent)]' : 'text-[var(--text-col)]'}`}>
                  {row.totalPoints.toFixed(1)}
                </span>
                <p className="text-xs text-[var(--muted)]">pts</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}
