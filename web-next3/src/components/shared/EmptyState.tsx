import { MagnifyingGlass } from '@phosphor-icons/react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-[var(--border-col)] bg-[var(--surface)]/60">
      <div className="w-12 h-12 rounded-2xl bg-[var(--border-col)] flex items-center justify-center mb-4 text-[var(--muted)]">
        {icon ?? <MagnifyingGlass size={22} weight="light" />}
      </div>
      <p className="font-display font-semibold text-[var(--text-col)] text-base mb-1">{title}</p>
      {description && (
        <p className="text-sm text-[var(--muted)] max-w-[40ch] leading-relaxed">{description}</p>
      )}
    </div>
  )
}
