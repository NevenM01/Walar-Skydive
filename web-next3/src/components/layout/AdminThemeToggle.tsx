import { Sun, Moon } from '@phosphor-icons/react'
import { useTheme } from '../../context/ThemeContext'

type Props = {
  className?: string
}

export function AdminThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ??
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-col)] bg-[var(--surface)] text-[var(--text-col)] shadow-sm transition hover:bg-[var(--accent-subtle)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
      }
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
    </button>
  )
}
