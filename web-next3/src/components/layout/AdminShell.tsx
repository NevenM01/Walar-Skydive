import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { ErrorBoundary } from '../ErrorBoundary'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/cn'
import { AdminThemeToggle } from './AdminThemeToggle'

const sideLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sky-100 text-walar-navy shadow-sm ring-1 ring-sky-200/90 dark:bg-sky-950/55 dark:text-sky-100 dark:ring-sky-800/70'
      : 'text-walar-navy/60 hover:bg-sky-50/90 hover:text-walar-navy dark:text-slate-400 dark:hover:bg-slate-800/90 dark:hover:text-slate-100',
  )

const adminNav = [
  { to: '/admin/athletes', label: 'Athletes' },
  { to: '/admin/competitions', label: 'Events' },
  { to: '/admin/csv', label: 'Results import' },
  { to: '/admin/ranking', label: 'Ranking' },
  { to: '/admin/duplicates', label: 'Duplicates' },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/news', label: 'News' },
  { to: '/admin/partners', label: 'Partners' },
] as const

const mobileNavLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sky-100 font-semibold text-walar-navy dark:bg-sky-950/60 dark:text-sky-100'
      : 'text-walar-navy hover:bg-sky-50/90 dark:text-slate-200 dark:hover:bg-slate-800/90',
  )

export function AdminShell() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex min-h-svh bg-soft-rose dark:bg-slate-950">
      <aside className="hidden w-56 shrink-0 border-r border-walar-border/80 bg-white shadow-[0_4px_24px_-8px_rgba(12,74,110,0.1)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)] md:block">
        <div className="flex h-full flex-col p-4">
          <NavLink
            to="/"
            className="mb-6 font-display text-sm font-bold text-walar-navy hover:text-walar-teal-dark"
          >
            ← Public site
          </NavLink>
          <div className="mb-4 rounded-2xl border border-walar-border/80 bg-sky-50/50 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800/60">
            <p className="truncate font-medium text-walar-navy dark:text-slate-200" title={user?.email ?? ''}>
              {user?.email ?? '—'}
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 text-left text-[11px] font-bold uppercase tracking-wide text-walar-teal-dark hover:underline"
            >
              Sign out
            </button>
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-walar-navy/35">Admin</p>
          <nav className="flex flex-col gap-1" aria-label="Admin navigation">
            {adminNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={sideLink}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[100] border-b border-walar-border/80 bg-white/95 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/95 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-walar-navy dark:text-slate-100">WALAR Admin</p>
              <p className="truncate text-[11px] text-walar-navy/50 dark:text-slate-400" title={user?.email ?? ''}>
                {user?.email}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <AdminThemeToggle className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-walar-border bg-white text-walar-navy shadow-sm transition hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" />
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-walar-border bg-white text-walar-navy shadow-sm transition hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="mt-3 overflow-hidden rounded-2xl border border-walar-border/80 bg-white shadow-[0_8px_32px_-8px_rgba(12,74,110,0.18)] dark:border-slate-600 dark:bg-slate-900 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.45)]"
                aria-label="Admin navigation (mobile)"
              >
                <div className="flex flex-col gap-1 p-3">
                  <NavLink
                    to="/"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-walar-teal-dark hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-slate-800/90"
                  >
                    ← Public site
                  </NavLink>
                  <div className="my-1 h-px bg-walar-border/60 dark:bg-slate-600" aria-hidden />
                  {adminNav.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={mobileNavLink}>
                      {item.label}
                    </NavLink>
                  ))}
                  <div className="my-1 h-px bg-walar-border/60 dark:bg-slate-600" aria-hidden />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      void signOut()
                    }}
                    className="rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-walar-navy hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-slate-800/90"
                  >
                    Sign out
                  </button>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>
        <main className="flex-1 bg-white/40 p-4 dark:bg-slate-950/50 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
