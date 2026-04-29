import type { MouseEvent } from 'react'
import type { Location, NavigateFunction } from 'react-router-dom'

/**
 * Use on logo / Home links: when already on `/`, scroll to top (and clear hash if present).
 * When coming from another path, the default navigation runs — pair with scroll-on-mount on HomePage.
 */
export function handleHomeNavigationClick(
  e: MouseEvent<HTMLAnchorElement>,
  location: Pick<Location, 'pathname' | 'hash'>,
  navigate: NavigateFunction,
) {
  if (location.pathname !== '/') return

  e.preventDefault()
  if (location.hash) {
    void navigate('/', { replace: true })
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
}
