import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Trophy, FlagPennant, Target, User, Globe, InstagramLogo, FacebookLogo } from '@phosphor-icons/react'
import type { Athlete, Competition } from '../types'
import { getAthlete, getAthleteCompetitions } from '../lib/api'
import { CountryFlag } from '../components/shared/CountryFlag'
import { StatusBadge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { EmptyState } from '../components/shared/EmptyState'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AthleteAvatarLarge({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border border-[var(--border-col)] flex items-center justify-center shrink-0 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.1)]">
      <span className="font-display font-black text-2xl text-[var(--muted)]">{initials}</span>
    </div>
  )
}

function maybeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function AthletePage() {
  const { id }         = useParams<{ id: string }>()
  const [athlete,    setAthlete]    = useState<Athlete | null>(null)
  const [events,     setEvents]     = useState<Competition[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getAthlete(id), getAthleteCompetitions(id)])
      .then(([a, evs]) => { setAthlete(a); setEvents(evs) })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load athlete.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <Link
        to="/results"
        className="inline-flex items-center gap-1.5 text-sm font-display text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150 mb-8 group"
      >
        <ArrowLeft size={14} weight="bold" className="group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to ranking
      </Link>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="space-y-6">
          <div className="flex items-center gap-5">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-20 rounded-2xl" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </div>
      ) : !athlete ? (
        <p className="text-[var(--muted)]">Athlete not found.</p>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Profile header — asymmetric: avatar left, stats right */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {athlete.avatarUrl ? (
              <img
                src={athlete.avatarUrl}
                alt={athlete.displayName}
                className="w-20 h-20 rounded-2xl object-cover border border-[var(--border-col)] shrink-0"
              />
            ) : (
              <AthleteAvatarLarge name={athlete.displayName} />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                {athlete.countryCode && <CountryFlag countryCode={athlete.countryCode} size="lg" />}
                {athlete.gender && (
                  <span className="text-xs font-display font-medium text-[var(--muted)] border border-[var(--border-col)] px-2 py-0.5 rounded-md">
                    {athlete.gender === 'M' ? 'Male' : 'Female'}
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter text-[var(--text-col)] leading-tight mb-1">
                {athlete.displayName}
              </h1>
              {athlete.faiLicence && (
                <p className="text-sm text-[var(--muted)]">FAI {athlete.faiLicence}</p>
              )}
            </div>

            {/* Points badge */}
            <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] px-6 py-4 text-center shrink-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
              <p className="font-display font-black text-3xl text-[var(--accent)] tabular leading-none">
                {athlete.rankingPoints.toFixed(1)}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1 font-display">ranking pts</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] grid grid-cols-2 sm:grid-cols-3 divide-x divide-[var(--border-col)]">
            {[
              { icon: <FlagPennant size={15} weight="bold" />, label: 'Competitions', value: athlete.competitionsCount },
              { icon: <Trophy size={15} weight="bold" />,      label: 'Ranking pts',  value: athlete.rankingPoints.toFixed(1) },
              { icon: <Target size={15} weight="bold" />,      label: 'Best round',   value: athlete.bestRoundCm !== null ? `${athlete.bestRoundCm} cm` : '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col items-center justify-center p-5 gap-1">
                <span className="text-[var(--accent)]">{icon}</span>
                <p className="font-display font-black text-xl tabular text-[var(--text-col)]">{value}</p>
                <p className="text-xs text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>

          {(athlete.bio || athlete.club || athlete.websiteUrl || athlete.instagramUrl || athlete.facebookUrl) ? (
            <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-5 md:p-6 space-y-4">
              {athlete.bio ? (
                <div>
                  <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)]">
                    Bio
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-col)] leading-relaxed whitespace-pre-wrap">
                    {athlete.bio}
                  </p>
                </div>
              ) : null}

              {athlete.club ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)]">Club</p>
                  <p className="text-sm font-medium text-[var(--text-col)] truncate">{athlete.club}</p>
                </div>
              ) : null}

              {(athlete.websiteUrl || athlete.instagramUrl || athlete.facebookUrl) ? (
                <div className="flex flex-wrap items-center gap-2">
                  {athlete.websiteUrl ? (
                    <a
                      href={athlete.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-col)] hover:bg-[var(--accent-subtle)] transition"
                    >
                      <Globe size={18} weight="bold" className="text-[var(--muted)]" />
                      {maybeHostname(athlete.websiteUrl)}
                    </a>
                  ) : null}
                  {athlete.instagramUrl ? (
                    <a
                      href={athlete.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-col)] hover:bg-[var(--accent-subtle)] transition"
                    >
                      <InstagramLogo size={18} weight="bold" className="text-[var(--muted)]" />
                      Instagram
                    </a>
                  ) : null}
                  {athlete.facebookUrl ? (
                    <a
                      href={athlete.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-col)] hover:bg-[var(--accent-subtle)] transition"
                    >
                      <FacebookLogo size={18} weight="bold" className="text-[var(--muted)]" />
                      Facebook
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Competition history */}
          <div>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] pb-4 border-b border-[var(--border-col)] mb-1">
              Competition history
            </p>

            {events.length === 0 ? (
              <EmptyState
                title="No competitions yet"
                description="This athlete has no registered competition results."
                icon={<User size={22} weight="light" />}
              />
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                className="divide-y divide-[var(--border-col)]"
              >
                {events.map((ev, i) => (
                  <motion.div
                    key={ev.id}
                    variants={{
                      hidden:  { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
                    }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-4"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/events/${ev.id}`}
                        className="font-display font-semibold text-sm text-[var(--text-col)] hover:text-[var(--accent)] transition-colors duration-150 truncate block"
                      >
                        {ev.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--muted)]">{formatDate(ev.startDate)}</span>
                        <span className="text-xs text-[var(--muted)]">{ev.location}</span>
                      </div>
                    </div>
                    <StatusBadge status={ev.status} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
