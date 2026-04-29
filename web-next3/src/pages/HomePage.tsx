import { useCallback, useEffect, useState } from 'react'
import type { Athlete, Competition, LeaderboardFilters, LeaderboardRow, NewsPost, ProjectPartner } from '../types'
import {
  getLeaderboard,
  getEvents,
  getHomepageNewsPosts,
  getLinkedProfileAthletesCount,
  getProjectPartners,
} from '../lib/api'
import { HeroSection } from '../components/home/HeroSection'
import { StatsBento } from '../components/home/StatsBento'
import { EventsStrip } from '../components/home/EventsStrip'
import { PartnersStrip } from '../components/home/PartnersStrip'

const DEFAULT_FILTERS: LeaderboardFilters = {
  category: 'all',
  window: '5y',
  faiClass: 'all',
  gender: 'all',
  licence: 'all',
  competitionId: null,
}

export default function HomePage() {
  const [rows,    setRows]    = useState<LeaderboardRow[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [events,  setEvents]  = useState<Competition[]>([])
  const [news,      setNews]      = useState<NewsPost[]>([])
  const [partners,   setPartners]   = useState<ProjectPartner[]>([])
  const [linkedProfileAthletesCount, setLinkedProfileAthletesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lb, evs, linkedCount] = await Promise.all([
        getLeaderboard(DEFAULT_FILTERS),
        getEvents(),
        getLinkedProfileAthletesCount().catch((err) => {
          console.error(err)
          return 0
        }),
      ])
      setRows(lb.rows)
      setAthletes(lb.athletes)
      setEvents(evs)
      setLinkedProfileAthletesCount(linkedCount)
    } catch (e) {
      console.error(e)
    }
    try {
      setNews(await getHomepageNewsPosts())
    } catch (e) {
      console.error(e)
      setNews([])
    }
    try {
      setPartners(await getProjectPartners())
    } catch {
      setPartners([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <HeroSection topRows={rows} athletes={athletes} loading={loading} />
      <StatsBento
        linkedProfileAthletesCount={linkedProfileAthletesCount}
        events={events}
        newsPosts={news}
        loading={loading}
      />
      <EventsStrip events={events} loading={loading} />
      <PartnersStrip partners={partners} loading={loading} />
    </div>
  )
}
