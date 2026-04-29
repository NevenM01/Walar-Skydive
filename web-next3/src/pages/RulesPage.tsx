import { useLayoutEffect } from 'react'
import { motion } from 'framer-motion'

const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    content: `The WALAR (World Accuracy Landing Ranking) is an international ranking system for precision skydiving accuracy landing. It aggregates results from registered FAI-class competitions worldwide and calculates a cumulative score for each athlete over a rolling 5-year window.`,
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    content: `Athletes must hold a valid FAI licence to be ranked in the official WALAR leaderboard (unless the administrator has enabled ranking without a licence). Athletes consent to having their name and nationality published. Date of birth is displayed as age or full date depending on athlete preference.`,
  },
  {
    id: 'scoring',
    title: 'Scoring System',
    content: `Results are scored using the WALAR points-cm lookup matrix, which converts jump distances (in centimetres from the target) to points based on the number of completed rounds. The final score is the sum of results points and rank bonus points.\n\nBonus points apply for:\n• Member of national team: +3 pts\n• Junior athlete: +1 pt\n• Average jump distance above 10 cm: −1 pt penalty\n• WPC medalist: +2 pts`,
  },
  {
    id: 'competition-tiers',
    title: 'Competition Tiers',
    content: `Competitions are classified by FAI event tier:\n• WPC — World Parachuting Championships\n• EPC — European Parachuting Championships\n• Wcup — World Cup\n• CISM — Conseil International du Sport Militaire\n• SWCS — Skydiving World Cup Series\n• NC — National Championships\n• WALAR A–F — Regional rankings tiers\n\nHigher-tier events carry greater weighting in the overall ranking.`,
  },
  {
    id: 'time-window',
    title: 'Time Window',
    content: `The default ranking window is 5 years (rolling). Filters are also available for the last 52 weeks and the current season (2025). A competition-specific filter allows viewing the leaderboard for a single event.`,
  },
  {
    id: 'privacy',
    title: 'Privacy & GDPR',
    content: `All athletes must provide GDPR consent to have their name published in the public ranking. Athletes who have not given consent will not appear. Date of birth is shown in full only when the athlete has chosen to display it; otherwise, only age is shown.`,
  },
]

export default function RulesPage() {
  useLayoutEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const run = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    run()
    requestAnimationFrame(run)
  }, [])

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Official Documentation</p>
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter text-[var(--text-col)] leading-none">Rules &amp; Scoring</h1>
      </motion.div>

      {/* Mobile / tablet: jump links (desktop TOC is in the sidebar below) */}
      <nav
        className="lg:hidden -mx-1 mb-8"
        aria-label="Page contents"
      >
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2 px-1">
          Contents
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-px-1 px-1">
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full border border-[var(--border-col)] bg-[var(--surface)] px-3 py-2 text-xs font-display font-medium text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors duration-150"
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 lg:gap-16">
        {/* Sidebar TOC */}
        <nav className="hidden lg:block" aria-label="Page contents">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">Contents</p>
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm font-display text-[var(--muted)] hover:text-[var(--text-col)] py-1 hover:text-[var(--accent)] transition-colors duration-150"
              >
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="space-y-12">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="scroll-mt-28 pb-10 border-b border-[var(--border-col)] last:border-0"
            >
              <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.content.split('\n').map((line, j) =>
                  line.startsWith('•') ? (
                    <p key={j} className="flex gap-2 text-sm text-[var(--muted)] leading-relaxed">
                      <span className="text-[var(--accent)] shrink-0 mt-0.5">•</span>
                      <span>{line.slice(2)}</span>
                    </p>
                  ) : line.trim() ? (
                    <p key={j} className="text-sm text-[var(--text-col)] leading-[1.75]">{line}</p>
                  ) : null
                )}
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  )
}
