import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, CalendarBlank, ArrowRight } from '@phosphor-icons/react'
import type { Competition } from '../../types'
import { StatusBadge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'

interface EventsStripProps {
  events: Competition[]
  loading: boolean
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.toLocaleDateString('en', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en', { ...opts, year: 'numeric' })}`
  }
  if (s.getMonth() !== e.getMonth()) {
    return `${s.toLocaleDateString('en', opts)} – ${e.toLocaleDateString('en', opts)}, ${e.getFullYear()}`
  }
  return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en', { month: 'long' })} ${e.getFullYear()}`
}

export function EventsStrip({ events, loading }: EventsStripProps) {
  const upcoming = events.filter(e => e.status === 'upcoming' || e.status === 'ongoing').slice(0, 5)

  return (
    <section className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-1">Calendar</p>
          <h2 className="font-display font-bold text-2xl tracking-tight text-[var(--text-col)]">Upcoming Events</h2>
        </div>
        <Link
          to="/events"
          className="hidden sm:flex items-center gap-1.5 text-sm font-display font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150 group"
        >
          All events
          <ArrowRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform duration-150" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))
          : upcoming.length === 0
          ? (
            <div className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
              No upcoming events scheduled.
            </div>
          )
          : upcoming.map((ev, i) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to={`/events/${ev.id}`}
                className="group block rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-5 hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)] transition-all duration-200 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <StatusBadge status={ev.status} />
                  {ev.faiClass && (
                    <span className="text-xs font-display text-[var(--muted)] shrink-0">{ev.faiClass}</span>
                  )}
                </div>
                <p className="font-display font-semibold text-sm text-[var(--text-col)] leading-snug mb-3 group-hover:text-[var(--accent)] transition-colors duration-150">
                  {ev.name}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <MapPin size={11} weight="bold" className="shrink-0" />
                    {ev.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <CalendarBlank size={11} weight="bold" className="shrink-0" />
                    {formatDateRange(ev.startDate, ev.endDate)}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        }
      </div>

      <div className="mt-4 sm:hidden">
        <Link
          to="/events"
          className="flex items-center gap-1.5 text-sm font-display font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150"
        >
          All events <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
    </section>
  )
}
