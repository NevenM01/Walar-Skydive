import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function CookiePolicyPage() {
  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Legal</p>
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter text-[var(--text-col)] leading-none">
          Cookie Policy
        </h1>
        <p className="mt-4 text-sm text-[var(--muted)] max-w-[90ch] leading-relaxed">
          This page explains how cookies and similar storage technologies are used on WALAR.
        </p>
      </motion.div>

      <div className="space-y-10">
        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">What we use</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            We currently use only essential storage required for basic functionality (for example, saving your theme preference).
            We do not use third-party analytics or marketing trackers by default.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Managing preferences</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            You can adjust cookie/storage permissions in your browser settings. For questions about personal data processing, see our{' '}
            <Link to="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}

