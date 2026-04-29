import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, PaperPlaneTilt } from '@phosphor-icons/react'
import { submitPartnerInquiry } from '../lib/partnerInquiriesFromSupabase'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { ErrorMessage } from '../components/shared/ErrorMessage'

const inputClass =
  'mt-2 w-full rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-col)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] disabled:opacity-55'

export default function BecomePartnerPage() {
  const [organizationName, setOrganizationName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!isSupabaseConfigured()) {
      setError('This form is not available until the site is connected to Supabase.')
      return
    }

    const org = organizationName.trim()
    const contact = contactName.trim()
    const em = email.trim().toLowerCase()
    if (!org || !contact || !em) {
      setError('Organization, contact name, and email are required.')
      return
    }

    setSubmitting(true)
    try {
      await submitPartnerInquiry({
        organizationName: org,
        contactName: contact,
        email: em,
        phone: phone.trim() || null,
        message: message.trim() || null,
      })
      setSuccess(true)
      setOrganizationName('')
      setContactName('')
      setEmail('')
      setPhone('')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your message.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <Link
          to="/partners"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150 mb-6"
        >
          <ArrowLeft size={18} aria-hidden />
          Back to partners
        </Link>
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
          Partner with WALAR
        </p>
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter text-[var(--text-col)] leading-none mb-3">
          Become a partner
        </h1>
        <p className="text-base text-[var(--muted)] max-w-[52ch]">
          Tell us about your organisation and how you would like to support the WALAR ranking programme. We'll review
          your inquiry and respond within a few business days.
        </p>
      </motion.div>

      {success ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-6 py-8 dark:border-emerald-900/45 dark:bg-emerald-950/35 max-w-xl"
        >
          <div className="flex gap-3">
            <CheckCircle size={28} weight="fill" className="text-emerald-700 dark:text-emerald-300 shrink-0" />
            <div>
              <p className="font-display font-bold text-emerald-950 dark:text-emerald-100">Thank you</p>
              <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                Your message has been submitted. A coordinator will contact you at the provided email address within a few business days.
              </p>
              <Link
                to="/partners"
                className="inline-flex mt-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200 underline-offset-4 hover:underline"
              >
                Return to partners
              </Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          onSubmit={(e) => void onSubmit(e)}
          className="max-w-xl rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] space-y-5"
        >
          {error ? <ErrorMessage message={error} /> : null}

          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-col)]">Organisation / company</span>
            <input
              name="organizationName"
              required
              maxLength={200}
              disabled={submitting}
              className={inputClass}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Aeroclub or brand name"
              autoComplete="organization"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-col)]">Contact name</span>
            <input
              name="contactName"
              required
              maxLength={200}
              disabled={submitting}
              className={inputClass}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-col)]">Email</span>
            <input
              name="email"
              type="email"
              required
              maxLength={320}
              disabled={submitting}
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-col)]">
              Phone <span className="font-normal text-[var(--muted)]">(optional)</span>
            </span>
            <input
              name="phone"
              type="tel"
              maxLength={60}
              disabled={submitting}
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+385 …"
              autoComplete="tel"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-col)]">
              Message <span className="font-normal text-[var(--muted)]">(optional)</span>
            </span>
            <span className="ml-2 text-xs text-[var(--muted)] tabular">{message.length}/4000</span>
            <textarea
              name="message"
              rows={5}
              maxLength={4000}
              disabled={submitting}
              className={`${inputClass} resize-y min-h-[120px]`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sponsorship tier, advertising, event collaboration, or other ideas…"
            />
          </label>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-h)] disabled:opacity-60"
            >
              <PaperPlaneTilt size={18} weight="bold" aria-hidden />
              {submitting ? 'Sending…' : 'Send inquiry'}
            </button>
          </div>
        </motion.form>
      )}
    </div>
  )
}
