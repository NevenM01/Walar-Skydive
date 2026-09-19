import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'
import {
  AuthSplitShell,
  authAccentLinkClass,
  authFieldShellClass,
  authInputClassNoLeftIcon,
  authLabelClass,
  authPrimaryButtonClass,
} from '../components/auth/AuthSplitShell'
import { searchPublicAthletesFromSupabase } from '../lib/athletesFromSupabase'
import { submitProfileEditRequest } from '../lib/profileEditRequestsFromSupabase'
import { uploadIdDocumentToStorage } from '../lib/idDocumentUpload'

type AthletePick = { id: string; displayName: string; countryCode: string }

function normalizeEmail(v: string): string {
  return v.trim().toLowerCase()
}

export default function RequestAccessPage() {
  const [email, setEmail] = useState('')
  const [query, setQuery] = useState('')
  const [athleteOptions, setAthleteOptions] = useState<AthletePick[]>([])
  const [loadingAthletes, setLoadingAthletes] = useState(false)
  const [selected, setSelected] = useState<AthletePick | null>(null)
  const [manualOpen, setManualOpen] = useState(false)

  const [manualFullName, setManualFullName] = useState('')
  const [manualCountryCode, setManualCountryCode] = useState('')
  const [manualFaiLicence, setManualFaiLicence] = useState('')
  const [manualYearOfBirth, setManualYearOfBirth] = useState('')
  const [message, setMessage] = useState('')
  const [idFile, setIdFile] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasManual = useMemo(() => {
    return Boolean(
      manualFullName.trim() ||
        manualCountryCode.trim() ||
        manualFaiLicence.trim() ||
        manualYearOfBirth.trim(),
    )
  }, [manualFullName, manualCountryCode, manualFaiLicence, manualYearOfBirth])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setAthleteOptions([])
      return
    }

    let cancelled = false
    setLoadingAthletes(true)
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchPublicAthletesFromSupabase(q)
          if (cancelled) return
          setAthleteOptions(rows)
        } catch {
          if (!cancelled) setAthleteOptions([])
        } finally {
          if (!cancelled) setLoadingAthletes(false)
        }
      })()
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      setError('Email is required.')
      return
    }

    if (!selected && !hasManual) {
      setError('Select an athlete or provide manual details.')
      return
    }

    if (!idFile) {
      setError('ID document is required.')
      return
    }

    const yobRaw = manualYearOfBirth.trim()
    const yob = yobRaw ? Number.parseInt(yobRaw, 10) : null
    if (yobRaw && (yob == null || !Number.isFinite(yob) || yob < 1900 || yob > new Date().getFullYear())) {
      setError('Enter a valid year of birth.')
      return
    }

    setSubmitting(true)
    try {
      const idDocumentPath = await uploadIdDocumentToStorage(idFile)
      await submitProfileEditRequest({
        email: normalizedEmail,
        athleteId: selected?.id ?? null,
        athleteSearchText: selected ? `${selected.displayName} (${selected.countryCode})` : query.trim() || null,
        manualFullName: manualFullName.trim() || null,
        manualCountryCode: manualCountryCode.trim() || null,
        manualFaiLicence: manualFaiLicence.trim() || null,
        manualYearOfBirth: yob,
        idDocumentPath,
        message: message.trim() || null,
      })

      setSuccess('Request submitted. An admin will contact you after review.')
      setSelected(null)
      setQuery('')
      setAthleteOptions([])
      setManualFullName('')
      setManualCountryCode('')
      setManualFaiLicence('')
      setManualYearOfBirth('')
      setMessage('')
      setIdFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitShell
      title="Request profile edit access"
      description="Submit a request to edit your athlete profile. After approval, you’ll receive an invite to log in."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-1 flex-col space-y-5">
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          We process the data you submit to verify profile ownership and provide access to edit your athlete profile. Your ID document is stored
          privately and is visible only to administrators. See our{' '}
          <Link to="/privacy" className={authAccentLinkClass}>Privacy Policy</Link>.
        </p>

        <label className={authLabelClass}>
          Email
          <div className={`${authFieldShellClass} mt-2`}>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              disabled={submitting}
              className={authInputClassNoLeftIcon}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </label>

        {manualOpen ? (
          <div className="rounded-[16px] border border-[var(--border-col)] bg-[color-mix(in_srgb,var(--surface)_92%,var(--accent-subtle))] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-col)]">Manual details</p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setManualOpen(false)}
                className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text-col)] transition disabled:opacity-55"
              >
                Search athlete instead
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className={authFieldShellClass}>
                <input
                  type="text"
                  disabled={submitting}
                  className={authInputClassNoLeftIcon}
                  placeholder="Full name"
                  value={manualFullName}
                  onChange={(e) => setManualFullName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={authFieldShellClass}>
                  <input
                    type="text"
                    disabled={submitting}
                    className={authInputClassNoLeftIcon}
                    placeholder="Country code (optional)"
                    value={manualCountryCode}
                    onChange={(e) => setManualCountryCode(e.target.value)}
                  />
                </div>
                <div className={authFieldShellClass}>
                  <input
                    type="text"
                    disabled={submitting}
                    className={authInputClassNoLeftIcon}
                    placeholder="FAI licence (optional)"
                    value={manualFaiLicence}
                    onChange={(e) => setManualFaiLicence(e.target.value)}
                  />
                </div>
              </div>
              <div className={authFieldShellClass}>
                <input
                  type="text"
                  disabled={submitting}
                  className={authInputClassNoLeftIcon}
                  placeholder="Year of birth (optional)"
                  value={manualYearOfBirth}
                  onChange={(e) => setManualYearOfBirth(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className={authLabelClass}>Find your athlete profile</p>
              <div className={`${authFieldShellClass} mt-2`}>
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                  size={20}
                  aria-hidden
                />
                <input
                  type="text"
                  disabled={submitting}
                  className="w-full rounded-[14px] border-0 bg-transparent py-3 pl-11 pr-3.5 text-sm text-[var(--text-col)] outline-none placeholder:text-[var(--muted)] disabled:opacity-55"
                  placeholder="Type at least 3 characters…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelected(null)
                    if (manualOpen) setManualOpen(false)
                  }}
                />
              </div>

              {selected ? (
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                  Selected: <strong>{selected.displayName}</strong> ({selected.countryCode})
                </p>
              ) : null}

              {!selected && loadingAthletes ? (
                <p className="mt-2 text-xs text-[var(--muted)]">Searching…</p>
              ) : !selected && athleteOptions.length ? (
                <div className="mt-2 rounded-[14px] border border-[var(--border-col)] overflow-hidden">
                  {athleteOptions.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setSelected(a)
                        setAthleteOptions([])
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-[var(--accent-subtle)] transition disabled:opacity-55"
                    >
                      <span className="font-semibold text-[var(--text-col)]">{a.displayName}</span>{' '}
                      <span className="text-[var(--muted)]">({a.countryCode})</span>
                    </button>
                  ))}
                </div>
              ) : !selected && query.trim().length >= 3 ? (
                <p className="mt-2 text-xs text-[var(--muted)]">No matches. Use manual details instead.</p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setManualOpen(true)
                setSelected(null)
                setQuery('')
                setAthleteOptions([])
              }}
              className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text-col)] transition text-left disabled:opacity-55"
            >
              Can’t find your athlete? Enter manual details
            </button>
          </>
        )}

        <div className="rounded-[16px] border border-[var(--border-col)] bg-[color-mix(in_srgb,var(--surface)_92%,var(--accent-subtle))] p-4">
          <p className="text-sm font-semibold text-[var(--text-col)]">ID document</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Upload a photo of an ID document where your name is visible. This is stored privately and only admins can view it.
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            disabled={submitting}
            className="mt-3 block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-xl file:border file:border-[var(--border-col)] file:bg-[var(--surface)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--text-col)] hover:file:bg-[var(--accent-subtle)]"
            onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          />
          {idFile ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Selected: <span className="font-semibold text-[var(--text-col)]">{idFile.name}</span> ({Math.round(idFile.size / 1024)} KB)
            </p>
          ) : null}
        </div>

        <label className={authLabelClass}>
          Message (optional)
          <textarea
            disabled={submitting}
            className="mt-2 w-full rounded-[14px] border border-[var(--border-col)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text-col)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)] disabled:opacity-55"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Anything that helps us verify ownership…"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[14px] border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
          >
            <WarningCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
        {success ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-[14px] border border-emerald-200/80 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </p>
        ) : null}

        <button type="submit" disabled={submitting || Boolean(success)} className={authPrimaryButtonClass}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--muted)]">
        Already invited?{' '}
        <Link to="/login" className={authAccentLinkClass}>
          Login here
        </Link>
      </p>
    </AuthSplitShell>
  )
}

