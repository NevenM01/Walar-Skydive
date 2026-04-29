import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { Skeleton } from '../ui/Skeleton'

export function RequireAdmin() {
  const { user, profile, loading, signOut } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-[var(--bg)] px-4">
        <div className="max-w-md rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <h1 className="font-display text-xl font-bold text-[var(--text-col)]">Admin requires Supabase</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Set <code className="rounded bg-[var(--accent-subtle)] px-1">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-[var(--accent-subtle)] px-1">VITE_SUPABASE_ANON_KEY</code> in{' '}
            <code className="rounded bg-[var(--accent-subtle)] px-1">.env.local</code>, then restart the dev server.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
            ← Back to site
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (!profile?.is_admin) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-[var(--bg)] px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
          <h1 className="font-display text-xl font-bold text-amber-950 dark:text-amber-100">Access denied</h1>
          <p className="mt-3 text-sm text-amber-900/85 dark:text-amber-200/90">
            You are signed in as <strong className="font-mono">{user.email}</strong>, but this account is not marked as
            an administrator. Ask a project owner to run the SQL in{' '}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">supabase/README.md</code> for your user
            id.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-xl bg-[#0c4a6e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#075985] dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Sign out
            </button>
            <Link
              to="/"
              className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100/80 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}
