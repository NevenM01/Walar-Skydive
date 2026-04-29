import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Medal } from '@phosphor-icons/react'
import type { Athlete, LeaderboardRow } from '../../types'
import { CountryFlag } from '../shared/CountryFlag'

interface HeroSectionProps {
  topRows: LeaderboardRow[]
  athletes: Athlete[]
  loading: boolean
}

function AthleteForRow(athleteId: string, athletes: Athlete[]) {
  return athletes.find(a => a.id === athleteId)
}

const STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const FADE_UP = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

const rankColors = ['text-[var(--accent)]', 'text-[var(--muted)]', 'text-[var(--accent-h)]']

export function HeroSection({ topRows, athletes, loading }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[120px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--accent)] opacity-[0.05] blur-[100px] -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-12 md:gap-8 lg:gap-16 items-center">

          {/* Left — Content */}
          <motion.div
            variants={STAGGER}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={FADE_UP}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-col)] bg-[var(--surface)] text-[var(--muted)] text-xs font-display font-medium tracking-widest uppercase">
                <Medal size={12} weight="fill" className="text-[var(--accent)]" />
                WALAR International Ranking
              </span>
            </motion.div>

            <motion.h1
              variants={FADE_UP}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.92] text-[var(--text-col)]"
            >
              Where the<br />
              <span className="text-[var(--accent)]">best skydivers</span><br />
              compete.
            </motion.h1>

            <motion.p variants={FADE_UP} className="text-base md:text-lg text-[var(--muted)] max-w-[44ch] leading-relaxed">
              The official ranking platform for international accuracy landing competitions. Live rankings, competition results, and athlete profiles — across every WALAR tier, updated after each event.
            </motion.p>

            <motion.div variants={FADE_UP} className="flex flex-wrap gap-3">
              <Link
                to="/results"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-display font-semibold text-sm hover:bg-[var(--accent-h)] transition-all duration-200 active:scale-[0.97] shadow-[0_2px_12px_color-mix(in_srgb,var(--accent)_30%,transparent)]"
              >
                View Full Ranking
                <ArrowRight size={15} weight="bold" />
              </Link>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-col)] bg-[var(--surface)] text-[var(--text-col)] font-display font-medium text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200 active:scale-[0.97]"
              >
                Browse Events
              </Link>
            </motion.div>
          </motion.div>

          {/* Right — Live Top 3 preview */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[var(--border-col)]">
                <div>
                  <p className="font-display font-bold text-sm text-[var(--text-col)]">Live Top 3</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">5-year rolling window</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y-2 divide-[var(--row-divider)]">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-4">
                      <div className="w-5 h-4 rounded bg-[var(--border-col)] animate-pulse shrink-0" />
                      <div className="w-8 h-8 rounded-full bg-[var(--border-col)] animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-28 rounded bg-[var(--border-col)] animate-pulse" />
                        <div className="h-3 w-16 rounded bg-[var(--border-col)] animate-pulse" />
                      </div>
                      <div className="h-5 w-12 rounded bg-[var(--border-col)] animate-pulse shrink-0" />
                    </div>
                  ))
                  : topRows.slice(0, 3).map((row, i) => {
                    const athlete = AthleteForRow(row.athleteId, athletes)
                    const initials = athlete?.displayName
                      .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                    return (
                      <motion.div
                        key={row.athleteId}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg)] transition-colors duration-150"
                      >
                        <span className={`font-display font-black text-sm tabular w-5 text-center shrink-0 ${rankColors[i]}`}>
                          {i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0 border border-[var(--border-col)]">
                          <span className="text-xs font-display font-bold text-[var(--muted)]">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-sm text-[var(--text-col)] truncate">
                            {athlete?.displayName ?? '—'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {athlete?.countryCode && <CountryFlag countryCode={athlete.countryCode} size="sm" />}
                            <span className="text-xs text-[var(--muted)]">{row.eventsCount} events</span>
                          </div>
                        </div>
                        <span className="font-display font-bold text-sm text-[var(--accent)] tabular shrink-0">
                          {row.totalPoints.toFixed(1)}
                        </span>
                      </motion.div>
                    )
                  })
                }
              </div>

              {/* CTA footer */}
              <div className="px-5 py-3 border-t border-[var(--border-col)] bg-[var(--bg)]">
                <Link
                  to="/results"
                  className="flex items-center justify-between text-xs font-display font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150 group"
                >
                  <span>See full ranking</span>
                  <ArrowRight size={12} weight="bold" className="group-hover:translate-x-0.5 transition-transform duration-150" />
                </Link>
              </div>
            </div>

            {/* Decorative accent line */}
            <div className="absolute -bottom-3 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />
          </motion.div>

        </div>
      </div>
    </section>
  )
}
