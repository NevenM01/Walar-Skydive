import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, CalendarBlank, ArrowRight } from '@phosphor-icons/react'
import type { Competition, CompetitionStatus } from '../types'
import { getEvents } from '../lib/api'
import { StatusBadge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { EmptyState } from '../components/shared/EmptyState'

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  if (s.toDateString() === e.toDateString())
    return s.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
  if (s.getFullYear() !== e.getFullYear())
    return `${s.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
  return `${s.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

const statusOrder: Record<CompetitionStatus, number> = {
  ongoing: 0, upcoming: 1, results_published: 2, completed: 3,
}

function EventCard({ ev, index }: { ev: Competition; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/events/${ev.id}`}
        className="group flex flex-col sm:flex-row sm:items-center gap-4 py-5 border-b border-[var(--border-col)] hover:bg-[var(--surface)] -mx-4 px-4 md:-mx-6 md:px-6 rounded-xl transition-all duration-150 active:scale-[0.99]"
      >
        {/* Date block */}
        <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[var(--border-col)] shrink-0 text-center">
          <span className="font-display font-black text-lg leading-none text-[var(--text-col)] tabular">
            {new Date(ev.startDate).getDate()}
          </span>
          <span className="text-xs font-display text-[var(--muted)] uppercase tracking-wide">
            {new Date(ev.startDate).toLocaleDateString('en', { month: 'short' })}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <StatusBadge status={ev.status} />
            {ev.faiClass && (
              <span className="text-xs font-display text-[var(--muted)]">{ev.faiClass}</span>
            )}
          </div>
          <p className="font-display font-semibold text-sm text-[var(--text-col)] group-hover:text-[var(--accent)] transition-colors duration-150 truncate">
            {ev.name}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <MapPin size={11} weight="bold" className="shrink-0" />
              {ev.location}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <CalendarBlank size={11} weight="bold" className="shrink-0" />
              {formatDateRange(ev.startDate, ev.endDate)}
            </span>
          </div>
        </div>

        <ArrowRight
          size={16}
          weight="bold"
          className="text-[var(--border-col)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all duration-150 shrink-0 hidden sm:block"
        />
      </Link>
    </motion.div>
  )
}

export default function EventsPage() {
  const [events,  setEvents]  = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    getEvents()
      .then(setEvents)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load events.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sorted  = [...events].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  const active  = sorted.filter(e => e.status === 'upcoming' || e.status === 'ongoing')
  const past    = sorted.filter(e => e.status === 'completed' || e.status === 'results_published')

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Competition Calendar</p>
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter text-[var(--text-col)] leading-none">
          Events
        </h1>
      </motion.div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-12">
          {active.length > 0 && (
            <section>
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] pb-4 border-b border-[var(--border-col)] mb-1">
                Upcoming &amp; Live
              </p>
              {active.map((ev, i) => <EventCard key={ev.id} ev={ev} index={i} />)}
            </section>
          )}

          {past.length > 0 && (
            <section>
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] pb-4 border-b border-[var(--border-col)] mb-1">
                Past Events
              </p>
              {past.map((ev, i) => <EventCard key={ev.id} ev={ev} index={i} />)}
            </section>
          )}

          {events.length === 0 && (
            <EmptyState title="No events yet" description="Check back soon for upcoming competitions." />
          )}
        </div>
      )}
    </div>
  )
}
