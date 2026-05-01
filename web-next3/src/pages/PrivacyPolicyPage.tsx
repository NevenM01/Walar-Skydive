import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-[var(--muted)] max-w-[90ch] leading-relaxed">
          This Privacy Policy explains how WALAR collects and processes personal data. It is provided for transparency and to support GDPR
          requirements. This text is a starting point and should be reviewed by your legal counsel.
        </p>
      </motion.div>

      <div className="space-y-10">
        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Controller & contact</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            Data controller: WALAR International.
          </p>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            Privacy contact: <span className="font-medium">walar.skydive@gmail.com</span>
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">What we collect</h2>
          <ul className="space-y-2 text-sm text-[var(--text-col)] leading-[1.75]">
            <li>
              <span className="font-medium">Account data</span>: email address.
            </li>
            <li>
              <span className="font-medium">Athlete profile data</span>: display name, nationality, and optional fields such as date of birth
              and licence identifier.
            </li>
            <li>
              <span className="font-medium">Requests</span>: contact email and any information you submit when requesting profile access,
              including optional identification details and an ID document image for verification.
            </li>
            <li>
              <span className="font-medium">Partner inquiries</span>: name, email, phone number and message.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Purposes & legal bases</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            We process personal data to operate the ranking, verify profile ownership, respond to inquiries, and maintain the integrity of the
            platform. Depending on the context, legal bases may include performance of a contract, legitimate interests, and consent.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Public display</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            Athlete names and nationality may be displayed in the public ranking only when the athlete has provided the required consent. Date of
            birth may be displayed as an age or full date depending on athlete preference.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Your rights</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            You may request access, rectification, deletion, restriction, and data portability where applicable. You can also withdraw consent for
            optional processing. Contact us using the address above.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)] mb-3">Cookies</h2>
          <p className="text-sm text-[var(--text-col)] leading-[1.75]">
            See our <Link to="/cookies" className="text-[var(--accent)] hover:underline">Cookie Policy</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}

