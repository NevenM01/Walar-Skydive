import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { List, Sun, Moon, X } from '@phosphor-icons/react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../hooks/useAuth'

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/results', label: 'Ranking' },
  { to: '/events', label: 'Events' },
  { to: '/news', label: 'News' },
  { to: '/partners', label: 'Partners' },
  { to: '/rules', label: 'Rules' },
]

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const [compact, setCompact] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastScroll = useRef(0)

  const showAdminNav = !authLoading && Boolean(user && profile?.is_admin)
  const isLoggedIn = !authLoading && Boolean(user)
  const showAccount = isLoggedIn

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY
      setCompact(y > 48)
      lastScroll.current = y
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <header className="sticky top-0 z-[100] w-full">
      <div className="max-w-[90rem] mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-3">
        <motion.div
          animate={{ paddingTop: compact ? 8 : 14, paddingBottom: compact ? 8 : 14 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between gap-2 px-4 md:px-6 rounded-2xl border border-[var(--border-col)] bg-[var(--surface)]/90 backdrop-blur-xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)]"
          style={{ paddingTop: 14, paddingBottom: 14 }}
        >
          <Link
            to="/"
            className="flex items-center gap-2 font-display font-bold tracking-tight text-[var(--text-col)] hover:text-[var(--accent)] transition-colors duration-200 shrink-0"
          >
            <span className="text-base">WALAR</span>
          </Link>

          <nav className="hidden md:flex flex-1 flex-wrap items-center justify-end gap-1 min-w-0">
            {NAV_LINKS.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium font-display transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--muted)] hover:text-[var(--text-col)] hover:bg-[var(--border-col)]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {showAdminNav ? (
              <>
                <span
                  className="mx-1 hidden h-4 w-px shrink-0 bg-[var(--border-col)] lg:block"
                  aria-hidden
                />
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium font-display border transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : 'border-[var(--border-col)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)]/50'
                    }`
                  }
                >
                  Admin
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 md:pl-3 md:ml-1 md:border-l md:border-[var(--border-col)]">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text-col)] hover:bg-[var(--border-col)] transition-all duration-200 active:scale-95"
            >
              {theme === 'dark'
                ? <Sun size={17} weight="bold" />
                : <Moon size={17} weight="bold" />}
            </button>

            {!authLoading && (
              <div className="hidden md:flex items-center gap-1.5">
                {isLoggedIn ? (
                  <>
                    {showAccount ? (
                      <NavLink
                        to="/account"
                        className={({ isActive }) =>
                          `px-3 py-1.5 rounded-lg text-sm font-medium font-display transition-all duration-200 whitespace-nowrap ${
                            isActive
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold'
                              : 'text-[var(--muted)] hover:text-[var(--text-col)] hover:bg-[var(--border-col)]'
                          }`
                        }
                      >
                        My profile
                      </NavLink>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold font-display text-[var(--muted)] hover:text-[var(--text-col)] hover:bg-[var(--border-col)] transition-all duration-200"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/request-access"
                      className={({ isActive }) =>
                        `px-3 py-1.5 rounded-lg text-sm font-medium font-display transition-all duration-200 ${
                          isActive
                            ? 'text-[var(--accent)] font-semibold'
                            : 'text-[var(--muted)] hover:text-[var(--text-col)] hover:bg-[var(--border-col)]'
                        }`
                      }
                    >
                      Request access
                    </NavLink>
                    <NavLink
                      to="/login"
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold font-display bg-[var(--accent)] text-white hover:bg-[var(--accent-h)] shadow-sm transition-all duration-200 active:scale-[0.97]"
                    >
                      Log in
                    </NavLink>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text-col)] hover:bg-[var(--border-col)] transition-all duration-200"
            >
              {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden mx-3 sm:mx-4 mt-1 rounded-2xl border border-[var(--border-col)] bg-[var(--surface)]/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <nav className="flex flex-col p-3 gap-1">
              {NAV_LINKS.map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2.5 rounded-xl text-sm font-medium font-display transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-col)] hover:bg-[var(--border-col)]'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              {showAdminNav && (
                <NavLink
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium font-display border border-[var(--border-col)] text-[var(--accent)]"
                >
                  Admin
                </NavLink>
              )}
              {!authLoading && (
                <>
                  {isLoggedIn ? (
                    <>
                      {showAccount ? (
                        <NavLink
                          to="/account"
                          onClick={() => setMenuOpen(false)}
                          className={({ isActive }) =>
                            `px-4 py-2.5 rounded-xl text-sm font-medium font-display transition-all duration-200 ${
                              isActive
                                ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold'
                                : 'text-[var(--text-col)] hover:bg-[var(--border-col)]'
                            }`
                          }
                        >
                          My profile
                        </NavLink>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          void signOut()
                        }}
                        className="px-4 py-2.5 rounded-xl text-left text-sm font-semibold font-display text-[var(--text-col)] hover:bg-[var(--border-col)]"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <NavLink
                        to="/request-access"
                        onClick={() => setMenuOpen(false)}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium font-display text-[var(--text-col)] hover:bg-[var(--border-col)]"
                      >
                        Request access
                      </NavLink>
                      <NavLink
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold font-display bg-[var(--accent-subtle)] text-[var(--accent)]"
                      >
                        Log in
                      </NavLink>
                    </>
                  )}
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
