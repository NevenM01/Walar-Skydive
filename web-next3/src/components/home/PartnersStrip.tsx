import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ProjectPartner } from '../../types'

/**
 * Marquee uses CSS translateX(-50%) on a doubled track; each half must be identical and
 * wide enough to cover the viewport so no empty gap appears before the loop repeats.
 */
const MARQUEE_SEGMENTS_PER_HALF = 36

interface PartnersStripProps {
  partners: ProjectPartner[]
  loading: boolean
}

export function PartnersStrip({ partners, loading }: PartnersStripProps) {
  const partnerMarqueeNames = useMemo(() => {
    return [...partners]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((p) => p.name)
  }, [partners])

  const partnerMarqueeFirstHalf = useMemo(() => {
    if (partnerMarqueeNames.length === 0) return null
    const half: string[] = []
    for (let i = 0; i < MARQUEE_SEGMENTS_PER_HALF; i++) {
      half.push(partnerMarqueeNames[i % partnerMarqueeNames.length])
    }
    return half
  }, [partnerMarqueeNames])

  return (
    <section
      className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 border-t border-[var(--border-col)]"
      aria-labelledby="home-partners-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 sm:p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="min-w-0">
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-1">Partners</p>
            <h2
              id="home-partners-heading"
              className="font-display font-bold text-2xl md:text-3xl tracking-tight text-[var(--text-col)]"
            >
              Partners & supporters
            </h2>
            <p className="mt-2 max-w-prose text-pretty text-sm text-[var(--muted)] leading-relaxed">
              Clubs, organisations, and shops that sponsor or advertise with WALAR. The full directory is on its own page.
            </p>
          </div>
          <Link
            to="/partners"
            className="shrink-0 text-sm font-display font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150 underline decoration-[var(--border-col)] underline-offset-4 hover:decoration-[var(--accent)]"
          >
            Full partner list →
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-[var(--bg)]/80 px-2 py-3 ring-1 ring-[var(--border-col)]/60">
          <div
            className="partners-marquee-track"
            aria-hidden={loading || partnerMarqueeNames.length === 0}
          >
            {loading ? (
              Array.from({ length: MARQUEE_SEGMENTS_PER_HALF * 2 }, (_, i) => (
                <span
                  key={`partners-skel-${i}`}
                  className="inline-flex h-10 w-40 shrink-0 animate-pulse rounded-lg bg-[var(--border-col)]/80"
                  aria-hidden
                />
              ))
            ) : partnerMarqueeFirstHalf ? (
              [...partnerMarqueeFirstHalf, ...partnerMarqueeFirstHalf].map((name, i) => (
                <span
                  key={`partner-marquee-${i}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-col)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--text-col)] shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)]"
                >
                  {name}
                </span>
              ))
            ) : (
              Array.from({ length: MARQUEE_SEGMENTS_PER_HALF * 2 }, (_, i) => (
                <span
                  key={`partners-empty-${i}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--border-col)] bg-[var(--surface)]/80 px-5 text-sm font-medium text-[var(--muted)]"
                >
                  Partner listings coming soon
                </span>
              ))
            )}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/85 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--surface)] via-[var(--surface)]/85 to-transparent"
            aria-hidden
          />
        </div>
      </motion.div>
    </section>
  )
}
