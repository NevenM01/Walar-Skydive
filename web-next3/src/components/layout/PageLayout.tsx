import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { ScrollAltitudeScene } from './ScrollAltitudeScene'
import { CookieBanner } from './CookieBanner'
import { SeoHead } from '../seo/SeoHead'

export function PageLayout() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    /* Hash targets are scrolled by the page that owns those ids (e.g. Rules lazy mount). */
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <SeoHead />
      <ScrollAltitudeScene />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col">
        <Header />
        <main className="flex-1" data-testid="app-main">
          <Outlet />
        </main>
        <Footer />
        <CookieBanner />
      </div>
    </div>
  )
}
