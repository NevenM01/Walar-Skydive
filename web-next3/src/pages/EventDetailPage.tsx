import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, CalendarBlank, ArrowLeft, Trophy } from '@phosphor-icons/react'
import type { Competition } from '../types'
import { getEvent } from '../lib/api'
import { StatusBadge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/shared/ErrorMessage'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EventDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const [event,   setEvent]   = useState<Competition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getEvent(id)
      .then(setEvent)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load event.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-sm font-display text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150 mb-8 group"
      >
        <ArrowLeft size={14} weight="bold" className="group-hover:-translate-x-0.5 transition-transform duration-150" />
        All events
      </Link>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : !event ? (
        <p className="text-[var(--muted)]">Event not found.</p>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <StatusBadge status={event.status} />
              {event.faiClass && (
                <span className="text-xs font-display text-[var(--muted)] border border-[var(--border-col)] px-2 py-0.5 rounded-md">
                  {event.faiClass}
                </span>
              )}
            </div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter text-[var(--text-col)] leading-tight mb-4">
              {event.name}
            </h1>
            <div className="flex flex-wrap gap-5">
              <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <MapPin size={14} weight="bold" className="text-[var(--accent)] shrink-0" />
                {event.location}
              </span>
              <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <CalendarBlank size={14} weight="bold" className="text-[var(--accent)] shrink-0" />
                {formatDate(event.startDate)} – {formatDate(event.endDate)}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
            {/* Description */}
            {event.description ? (
              <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6">
                <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">About this event</p>
                <p className="text-sm text-[var(--text-col)] leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-col)] p-6 flex items-center gap-3 text-[var(--muted)]">
                <Trophy size={20} weight="light" />
                <p className="text-sm">No description available.</p>
              </div>
            )}

            {/* Meta */}
            <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 space-y-4">
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)]">Details</p>
              <div className="divide-y divide-[var(--border-col)]">
                {[
                  { label: 'Category', value: event.category },
                  { label: 'Status',   value: event.status.replace('_', ' ') },
                  event.uniqueLabel ? { label: 'Code', value: event.uniqueLabel } : null,
                ].filter(Boolean).map(row => (
                  <div key={row!.label} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-[var(--muted)]">{row!.label}</span>
                    <span className="font-display font-medium text-[var(--text-col)] capitalize">{row!.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results note */}
          {(event.status === 'results_published' || event.status === 'completed') && (
            <div className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-subtle)] p-5 flex items-center justify-between gap-4">
              <p className="text-sm font-display font-medium text-[var(--accent)]">
                Results for this event are reflected in the WALAR ranking.
              </p>
              <Link
                to={`/results?event=${event.id}`}
                className="shrink-0 text-xs font-display font-semibold text-[var(--accent)] hover:underline"
              >
                View ranking
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
