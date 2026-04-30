import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EnvelopeSimple, Eye, EyeSlash, X } from '@phosphor-icons/react'
import {
  AuthSplitShell,
  authAccentLinkClass,
  authFieldShellClass,
  authInputClass,
  authInputClassNoLeftIconWithRightIcon,
  authLabelClass,
  authMutedLinkClass,
  authPrimaryButtonClass,
} from '../components/auth/AuthSplitShell'
import { useAuth } from '../hooks/useAuth'

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/')) return '/admin'
  return raw
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = safeRedirect(params.get('redirect'))

  const { user, profile, loading, signInWithPassword, resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState(false)

  const closeForgot = useCallback(() => {
    setForgotOpen(false)
    setForgotError(null)
    setForgotSuccess(false)
    setForgotEmail('')
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) return

    if (profile?.is_admin) {
      navigate(redirectTo, { replace: true })
      return
    }

    // Competitors/non-admin users should not stay on the admin login screen.
    navigate('/account', { replace: true })
  }, [loading, user, profile, navigate, redirectTo])

  useEffect(() => {
    if (!forgotOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeForgot()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [forgotOpen, closeForgot])

  async function onForgotSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setForgotError(null)
    const trimmed = forgotEmail.trim()
    if (!trimmed) {
      setForgotError('Enter your email address.')
      return
    }
    setForgotSubmitting(true)
    try {
      const { error: err } = await resetPasswordForEmail(trimmed)
      if (err) {
        setForgotError(err.message)
        return
      }
      setForgotSuccess(true)
    } finally {
      setForgotSubmitting(false)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    setSubmitting(true)
    try {
      const { error: err } = await signInWithPassword(email.trim(), password)
      if (err) {
        setError(err.message)
        return
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-center text-sm text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

  if (user && profile?.is_admin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-center text-sm text-[var(--muted)]">Opening admin…</p>
      </div>
    )
  }

  if (user && !profile?.is_admin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-center text-sm text-[var(--muted)]">Opening your account…</p>
      </div>
    )
  }

  return (
    <AuthSplitShell
      title="Login"
      description="You'll be redirected automatically after signing in."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-1 flex-col space-y-5">
        <label className={authLabelClass}>
          Email
          <div className={`${authFieldShellClass} mt-2`}>
            <EnvelopeSimple
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={20}
              aria-hidden
            />
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              disabled={submitting}
              className={authInputClass}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </label>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label className={authLabelClass} htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              className={authMutedLinkClass}
              onClick={() => {
                setForgotEmail(email)
                setForgotOpen(true)
                setForgotError(null)
                setForgotSuccess(false)
              }}
            >
              Forgot password?
            </button>
          </div>
          <div className={`${authFieldShellClass} mt-2`}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              disabled={submitting}
              className={authInputClassNoLeftIconWithRightIcon}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--accent-subtle)] hover:text-[var(--text-col)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-[14px] border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
          {submitting ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--muted)]">
        Don&apos;t have access yet?{' '}
        <Link to="/request-access" className={authAccentLinkClass}>
          Request access
        </Link>
      </p>

      {forgotOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-md dark:bg-black/45"
            aria-label="Close dialog"
            onClick={closeForgot}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            className="relative z-[1] w-full max-w-md overflow-hidden rounded-[20px] border border-[var(--border-col)] bg-[var(--surface)] p-6 shadow-[0_24px_80px_-24px_rgba(14,58,79,0.35)] dark:shadow-[0_28px_90px_-28px_rgba(0,0,0,0.55)] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="forgot-password-title"
                className="font-display text-xl font-bold tracking-tight text-[var(--text-col)]"
              >
                {forgotSuccess ? 'Check your email' : 'Reset password'}
              </h2>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--accent-subtle)] hover:text-[var(--text-col)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                onClick={closeForgot}
                aria-label="Close"
              >
                <X size={22} weight="bold" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="mt-6 space-y-6">
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  If an account exists for{' '}
                  <span className="break-all font-medium text-[var(--text-col)]">{forgotEmail.trim()}</span>, we sent a
                  password reset link there. Check spam and typos — you can open this dialog again with a different
                  email if needed.
                </p>
                <button type="button" className={authPrimaryButtonClass} onClick={closeForgot}>
                  OK
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={(e) => void onForgotSubmit(e)}>
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  We&apos;ll email you a link to choose a new password.
                </p>
                <label className={authLabelClass}>
                  Email
                  <div className={`${authFieldShellClass} mt-2`}>
                    <EnvelopeSimple
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                      size={20}
                      aria-hidden
                    />
                    <input
                      type="email"
                      name="forgot-email"
                      autoComplete="email"
                      required
                      disabled={forgotSubmitting}
                      className={authInputClass}
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </label>
                {forgotError ? (
                  <p
                    role="alert"
                    className="rounded-[14px] border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                  >
                    {forgotError}
                  </p>
                ) : null}
                <button type="submit" disabled={forgotSubmitting} className={authPrimaryButtonClass}>
                  {forgotSubmitting ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </AuthSplitShell>
  )
}
