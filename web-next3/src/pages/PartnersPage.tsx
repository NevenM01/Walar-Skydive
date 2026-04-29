import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowSquareOut } from '@phosphor-icons/react'
import type { ProjectPartner, ProjectPartnerKind } from '../types'
import { getProjectPartners } from '../lib/api'
import { isBecomePartnerPlaceholder } from '../lib/partnerInterest'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { EmptyState } from '../components/shared/EmptyState'

const SECTION_LABELS: Record<ProjectPartnerKind, string> = {
  sponsor:    'Title Sponsors',
  advertiser: 'Advertising Partners',
  supporter:  'Supporters',
}

const SECTION_ORDER: ProjectPartnerKind[] = ['sponsor', 'advertiser', 'supporter']

export default function PartnersPage() {
  const [partners, setPartners] = useState<ProjectPartner[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    getProjectPartners()
      .then(setPartners)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load partners.'))
      .finally(() => setLoading(false))
  }, [])

  const grouped = SECTION_ORDER.reduce<Record<ProjectPartnerKind, ProjectPartner[]>>(
    (acc, kind) => {
      acc[kind] = partners.filter(p => p.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder)
      return acc
    },
    { sponsor: [], advertiser: [], supporter: [] }
  )

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Supporting WALAR</p>
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter text-[var(--text-col)] leading-none mb-3">Partners</h1>
        <p className="text-base text-[var(--muted)] max-w-[52ch]">
          Organizations and companies that support the WALAR international ranking programme.
        </p>
      </motion.div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-20 rounded-2xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : partners.length === 0 ? (
        <div className="space-y-6">
          <EmptyState title="No partners listed" description="Partner information will appear here." />
          <div className="flex justify-center">
            <Link
              to="/partners/become-a-partner"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-col)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] transition-all duration-200"
            >
              Become a partner
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {SECTION_ORDER.map(kind => {
            const items = grouped[kind]
            const partnersOnly = items.filter((p) => !isBecomePartnerPlaceholder(p))
            const showBecomePartnerCard = kind === 'sponsor'
            if (partnersOnly.length === 0 && !showBecomePartnerCard) return null
            return (
              <section key={kind}>
                <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] pb-4 border-b border-[var(--border-col)] mb-6">
                  {SECTION_LABELS[kind]}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {partnersOnly.map((partner, i) => (
                    <motion.a
                      key={partner.id}
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="group flex flex-col items-center justify-center text-center rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 gap-2 hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] transition-all duration-200"
                    >
                      <p className="font-display font-bold text-sm text-[var(--text-col)] group-hover:text-[var(--accent)] transition-colors duration-150">
                        {partner.name}
                      </p>
                      {partner.tagline && (
                        <p className="text-xs text-[var(--muted)] leading-relaxed">{partner.tagline}</p>
                      )}
                      <ArrowSquareOut
                        size={12}
                        className="text-[var(--border-col)] group-hover:text-[var(--accent)] transition-colors duration-150 mt-1"
                      />
                    </motion.a>
                  ))}
                  {showBecomePartnerCard ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{
                        delay: partnersOnly.length * 0.05,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-0 overflow-hidden hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] transition-all duration-200"
                    >
                      <Link
                        to="/partners/become-a-partner"
                        className="group flex flex-col items-center justify-center text-center p-6 gap-2 min-h-[5.5rem]"
                      >
                        <p className="font-display font-bold text-sm text-[var(--accent)] group-hover:text-[var(--accent)] transition-colors duration-150">
                          Become a partner
                        </p>
                        <p className="text-xs text-[var(--muted)] leading-relaxed">Open the inquiry form</p>
                        <ArrowRight
                          size={12}
                          weight="bold"
                          className="text-[var(--border-col)] group-hover:text-[var(--accent)] transition-colors duration-150 mt-1"
                        />
                      </Link>
                    </motion.div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
