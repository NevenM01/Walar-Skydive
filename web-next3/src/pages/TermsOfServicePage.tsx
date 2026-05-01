import { motion } from 'framer-motion'

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-[var(--muted)] max-w-[90ch] leading-relaxed">
          These Terms govern your use of WALAR. This text is a starting point and should be reviewed by your legal counsel.
        </p>
      </motion.div>

      <div className="space-y-10">
        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Use of the service</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            You agree to use the service lawfully and not to interfere with its operation.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Accounts</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            If you create an account, you are responsible for maintaining its confidentiality and for all activity under your account.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Ranking & data accuracy</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            Rankings are calculated from competition results and may contain errors. We do not guarantee completeness or accuracy.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Limitation of liability</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            To the maximum extent permitted by law, WALAR International is not liable for indirect or consequential damages.
          </p>
        </section>
      </div>
    </div>
  )
}

