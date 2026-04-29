import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, FlagPennant, Newspaper } from '@phosphor-icons/react'
import type { Competition, NewsPost } from '../../types'

interface StatsBentoProps {
  linkedProfileAthletesCount: number
  events: Competition[]
  newsPosts: NewsPost[]
  loading: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatEventRange(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    const month = start.toLocaleDateString('en', { month: 'short' })
    return `${month} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
  }

  if (sameYear) {
    const startLabel = start.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    const endLabel = end.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    return `${startLabel}–${endLabel}, ${start.getFullYear()}`
  }

  const startLabel = start.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
  const endLabel = end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel}–${endLabel}`
}

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const start = useRef<number | null>(null)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (value === 0) return
    start.current = null
    const step = (ts: number) => {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4)
      setDisplay(Math.round(ease * value))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  return <>{display}</>
}

const FADE_UP = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function StatsBento({ linkedProfileAthletesCount, events, newsPosts, loading }: StatsBentoProps) {
  const completedEvents = events.filter(e => e.status === 'completed' || e.status === 'results_published').length
  const [featured, ...restNews] = newsPosts
  const nextEvent = events
    .filter((e) => e.status === 'ongoing' || e.status === 'upcoming')
    .sort((a, b) => {
      const byStatus = a.status === b.status ? 0 : a.status === 'ongoing' ? -1 : 1
      if (byStatus !== 0) return byStatus
      return +new Date(a.startDate) - +new Date(b.startDate)
    })[0]

  return (
    <section className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-4">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4">

        {/* Wide card — latest news */}
        <motion.div
          custom={0}
          variants={FADE_UP}
          initial="hidden"
          animate="visible"
          className="relative rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-5 sm:p-8 overflow-hidden flex flex-col justify-between min-h-[180px] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]"
        >
          <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl bg-[var(--accent)]" />

          <div className="pl-2 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <Newspaper size={16} weight="bold" className="text-[var(--accent)]" />
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--accent)]">Latest news</p>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-8 w-full max-w-md rounded-lg bg-[var(--border-col)] animate-pulse" />
                <div className="h-4 w-48 rounded bg-[var(--border-col)] animate-pulse" />
                <div className="h-6 w-full max-w-sm rounded-lg bg-[var(--border-col)] animate-pulse mt-4" />
              </div>
            ) : !featured ? (
              <p className="text-[var(--muted)] text-sm">No news yet.</p>
            ) : (
              <div className="space-y-4 min-h-0">
                <Link
                  to={`/news/${featured.id}`}
                  className="block group rounded-xl -mx-1 px-1 py-0.5 focus-visible:outline-offset-2"
                >
                  <h3 className="font-display font-bold text-xl md:text-2xl tracking-tight text-[var(--text-col)] leading-snug group-hover:text-[var(--accent)] transition-colors duration-150">
                    {featured.title}
                  </h3>
                  <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2 leading-relaxed">{featured.excerpt}</p>
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {formatDate(featured.publishedAt)}
                    {featured.category ? ` · ${featured.category}` : ''}
                  </p>
                </Link>

                {restNews.length > 0 && (
                  <ul className="space-y-2 pt-2 border-t border-[var(--border-col)]">
                    {restNews.map(post => (
                      <li key={post.id}>
                        <Link
                          to={`/news/${post.id}`}
                          className="block group rounded-lg py-1.5 -mx-1 px-1 focus-visible:outline-offset-2"
                        >
                          <span className="font-display font-semibold text-sm text-[var(--text-col)] group-hover:text-[var(--accent)] transition-colors duration-150 line-clamp-2">
                            {post.title}
                          </span>
                          <span className="block text-xs text-[var(--muted)] mt-0.5">
                            {formatDate(post.publishedAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to="/news"
                  className="inline-flex text-xs font-display font-medium text-[var(--accent)] hover:text-[var(--accent-h)] transition-colors duration-150 pt-1"
                >
                  All news →
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          custom={1}
          variants={FADE_UP}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 flex flex-col justify-between min-h-[160px] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-2">
            <Users size={16} weight="bold" className="text-[var(--accent)]" />
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--accent)]">Registered athletes</p>
          </div>
          <div>
            <p className="font-display font-black text-4xl tracking-tighter text-[var(--text-col)] tabular leading-none">
              {loading ? (
                <span className="inline-block h-10 w-16 rounded-lg bg-[var(--border-col)] animate-pulse align-middle" />
              ) : (
                <AnimatedCounter value={linkedProfileAthletesCount} />
              )}
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">with public profile</p>
          </div>
          <Link
            to="/request-access"
            className="inline-flex text-xs font-display font-medium text-[var(--accent)] hover:text-[var(--accent-h)] transition-colors duration-150"
          >
            Request access →
          </Link>
        </motion.div>

        <motion.div
          custom={2}
          variants={FADE_UP}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 flex flex-col justify-between min-h-[160px] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-2">
            <FlagPennant size={16} weight="bold" className="text-[var(--accent)]" />
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--accent)]">Events</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-display font-black text-4xl tracking-tighter text-[var(--text-col)] tabular leading-none">
              {loading ? (
                <span className="inline-block h-10 w-12 rounded-lg bg-[var(--border-col)] animate-pulse align-middle" />
              ) : (
                <AnimatedCounter value={completedEvents} />
              )}
              </p>
              <p className="text-sm text-[var(--muted)] mt-1">with results</p>
            </div>

            <div className="rounded-xl border border-[var(--border-col)] bg-[color-mix(in_srgb,var(--surface)_92%,var(--accent-subtle))] px-3.5 py-3">
              <p className="text-[11px] font-display font-semibold uppercase tracking-widest text-[var(--muted)]">
                Next event
              </p>
              {loading ? (
                <div className="mt-2 space-y-2">
                  <div className="h-4 w-5/6 rounded bg-[var(--border-col)] animate-pulse" />
                  <div className="h-3.5 w-3/5 rounded bg-[var(--border-col)] animate-pulse" />
                </div>
              ) : nextEvent ? (
                <div className="mt-2 min-w-0">
                  <p className="font-display text-sm font-semibold text-[var(--text-col)] leading-snug line-clamp-2">
                    {nextEvent.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                    {formatEventRange(nextEvent.startDate, nextEvent.endDate)}
                    {nextEvent.location ? ` · ${nextEvent.location}` : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">No upcoming events.</p>
              )}
            </div>

            <Link
              to="/events"
              className="inline-flex text-xs font-display font-medium text-[var(--accent)] hover:text-[var(--accent-h)] transition-colors duration-150"
            >
              All events →
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
