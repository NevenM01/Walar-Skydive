import { Warning } from '@phosphor-icons/react'
import { Button } from '../ui/Button'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 text-red-900 p-6 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
      <div className="flex items-start gap-3">
        <Warning size={20} weight="fill" className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm mb-1">Something went wrong</p>
          <p className="text-sm opacity-80 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
