import { Link } from 'react-router-dom'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-24 border-t border-[var(--border-col)] bg-[var(--surface)]">
      <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-8 md:gap-16">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-flex items-center font-display font-bold text-[var(--text-col)] mb-3">
              WALAR
            </Link>
            <p className="text-sm text-[var(--muted)] max-w-[34ch] leading-relaxed">
              The international accuracy landing ranking — tracking the world's top skydivers across competitions worldwide.
            </p>
          </div>

          {/* Portal */}
          <div>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">Portal</p>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/results',  label: 'Ranking' },
                { to: '/events',   label: 'Events' },
                { to: '/news',     label: 'News' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-[var(--muted)] hover:text-[var(--text-col)] transition-colors duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">Info</p>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/rules',    label: 'Rules' },
                { to: '/partners', label: 'Partners' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-[var(--muted)] hover:text-[var(--text-col)] transition-colors duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border-col)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-[var(--muted)]">&copy; {year} WALAR International. All rights reserved.</p>
          <p className="text-xs text-[var(--muted)]">FAI-recognised international ranking</p>
        </div>
      </div>
    </footer>
  )
}
