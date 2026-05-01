import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

type SeoConfig = {
  title: string
  description: string
}

const DEFAULT_DESCRIPTION =
  'The official international ranking for accuracy landing skydiving. Live results, athlete profiles, and competition history across all FAI-class events.'

function getSeoForPath(pathname: string): SeoConfig {
  switch (pathname) {
    case '/':
      return {
        title: 'WALAR — World Accuracy Landing Ranking',
        description: DEFAULT_DESCRIPTION,
      }
    case '/results':
      return {
        title: 'Leaderboard | WALAR',
        description: 'Explore the WALAR leaderboard and track the world’s top accuracy landing athletes.',
      }
    case '/events':
      return {
        title: 'Competition Calendar | WALAR',
        description: 'Browse the competition calendar and follow FAI-class accuracy landing events worldwide.',
      }
    case '/news':
      return {
        title: 'News | WALAR',
        description: 'Read the latest WALAR news, announcements, and competition highlights.',
      }
    case '/privacy':
      return {
        title: 'Privacy Policy | WALAR',
        description: 'Read the WALAR privacy policy and learn how we collect and use data.',
      }
    case '/terms':
      return {
        title: 'Terms of Service | WALAR',
        description: 'Review the WALAR terms of service for using the ranking portal.',
      }
    case '/cookies':
      return {
        title: 'Cookie Policy | WALAR',
        description: 'Learn how WALAR uses cookies and how you can manage your preferences.',
      }
    case '/partners':
      return {
        title: 'Partners | WALAR',
        description: 'Meet WALAR partners supporting accuracy landing skydiving worldwide.',
      }
    case '/partners/become-a-partner':
      return {
        title: 'Become a Partner | WALAR',
        description: 'Apply to become a WALAR partner and support the international accuracy landing ranking.',
      }
    case '/rules':
      return {
        title: 'Rules | WALAR',
        description: 'Understand the WALAR ranking rules, windows, and scoring methodology.',
      }
  }

  if (pathname.startsWith('/events/')) {
    return { title: 'Event | WALAR', description: 'View event details, standings, and results on WALAR.' }
  }
  if (pathname.startsWith('/news/')) {
    return { title: 'News | WALAR', description: 'Read WALAR news and updates.' }
  }
  if (pathname.startsWith('/athlete/')) {
    return { title: 'Athlete | WALAR', description: 'View athlete profile and performance history on WALAR.' }
  }

  return { title: 'WALAR', description: DEFAULT_DESCRIPTION }
}

function upsertMetaDescription(content: string) {
  let el = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', 'description')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function SeoHead() {
  const { pathname } = useLocation()

  useEffect(() => {
    const { title, description } = getSeoForPath(pathname)
    document.title = title
    upsertMetaDescription(description)

    const canonical = `${window.location.origin}${pathname}`
    upsertCanonical(canonical)
  }, [pathname])

  return null
}

