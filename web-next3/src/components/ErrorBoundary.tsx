import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16">
          <h1 className="font-display text-xl font-semibold text-[var(--text-col)]">Display error</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{this.state.error.message}</p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-h)]"
          >
            Home
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}
