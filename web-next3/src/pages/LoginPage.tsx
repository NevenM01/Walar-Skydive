import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EnvelopeSimple, Eye, EyeSlash } from '@phosphor-icons/react'
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

  const { user, profile, loading, signInWithPassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    setSubmitting(true)
    try {
      const { error: err } = await signInWithPassword(email, password)
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
            />
          </div>
        </label>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label className={authLabelClass} htmlFor="login-password">
              Password
            </label>
            <Link to="/contact" className={authMutedLinkClass}>
              Forgot password?
            </Link>
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
    </AuthSplitShell>
  )
}
