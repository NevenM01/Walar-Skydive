import type { CompetitionStatus } from '../../types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'muted' | CompetitionStatus
  className?: string
}

const variants: Record<string, string> = {
  default:             'bg-[var(--border-col)] text-[var(--muted)]',
  accent:              'bg-[var(--accent-subtle)] text-[var(--accent)]',
  muted:               'bg-[var(--surface)] border border-[var(--border-col)] text-[var(--muted)]',
  upcoming:            'bg-[var(--accent-subtle)] text-[var(--accent-h)] border border-[var(--border-col)] dark:bg-[var(--accent-subtle)] dark:text-[var(--accent)] dark:border-[var(--border-col)]',
  ongoing:             'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/50',
  completed:           'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-600/50',
  results_published:   'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
}

const statusLabels: Record<CompetitionStatus, string> = {
  upcoming:          'Upcoming',
  ongoing:           'Live',
  completed:         'Completed',
  results_published: 'Results',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium font-display tabular ${variants[variant] ?? variants.default} ${className}`}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: CompetitionStatus }) {
  return (
    <Badge variant={status}>
      {status === 'ongoing' && (
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
      )}
      {statusLabels[status]}
    </Badge>
  )
}
