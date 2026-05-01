import type { Athlete, LeaderboardFilters, LeaderboardRow } from '../types'
import { WALAR_RANKING_WINDOW_YEARS } from './walarConstants'
import { getSupabaseBrowserClient } from './supabaseClient'
import { normalizeUnicodeForDisplay } from './unicodeAthleteDisplay'

type EdgeLeaderboardRow = {
  rank?: number
  athleteId: string
  totalPoints: number
  eventsCount: number
  displayName: string
  gender: string
  avatarUrl: string | null
  countrySportCode: string
  countryIso2: string
  countryFlagUrl: string | null
}

export type LeaderboardPageQuery = {
  offset: number
  limit: number
}

function windowToYears(window: string): number {
  if (window === '5y') return WALAR_RANKING_WINDOW_YEARS
  if (window === '52w') return 1
  // season2025 uses explicit date range — handled via seasonStart/seasonEnd params
  if (window === 'season2025') return WALAR_RANKING_WINDOW_YEARS
  return WALAR_RANKING_WINDOW_YEARS
}

function windowToSeasonRange(window: string): { seasonStart: string | null; seasonEnd: string | null } {
  if (window === 'season2025') return { seasonStart: '2025-01-01', seasonEnd: '2025-12-31' }
  return { seasonStart: null, seasonEnd: null }
}

/** Leaderboard from `get_leaderboard` RPC + synthetic `Athlete` rows for the UI. */
export async function fetchLeaderboardFromSupabase(
  filters: LeaderboardFilters,
  page?: Partial<LeaderboardPageQuery>,
): Promise<{ rows: LeaderboardRow[]; athletes: Athlete[] }> {
  const client = getSupabaseBrowserClient()
  if (!client) {
    throw new Error('Supabase is not configured')
  }

  const { seasonStart, seasonEnd } = windowToSeasonRange(filters.window)
  const offset = Math.max(0, Math.trunc(page?.offset ?? 0))
  const limit = Math.min(500, Math.max(1, Math.trunc(page?.limit ?? 100)))

  const { data: res, error } = await client.functions.invoke('public-leaderboard', {
    body: {
      gender: filters.gender,
      competitionId: filters.competitionId || null,
      windowYears: windowToYears(filters.window),
      licence: filters.licence,
      seasonStart,
      seasonEnd,
      offset,
      limit,
    },
  })
  if (error) throw new Error(error.message)
  if (!res?.data) throw new Error('public-leaderboard failed')

  const list = (res.data ?? []) as EdgeLeaderboardRow[]

  const rows: LeaderboardRow[] = list.map((r, i) => ({
    rank: Number.isFinite(Number(r.rank)) ? Number(r.rank) : offset + i + 1,
    athleteId: r.athleteId,
    totalPoints: Number(r.totalPoints),
    eventsCount: Number(r.eventsCount),
    bestRoundCm: null,
  }))

  const athletes: Athlete[] = list.map((r) => ({
    id: r.athleteId,
    displayName: normalizeUnicodeForDisplay(r.displayName),
    countryCode: r.countrySportCode,
    rankingPoints: Number(r.totalPoints),
    gdprFlags: { publishFullName: true, consentGiven: true },
    competitionsCount: Number(r.eventsCount),
    bestRoundCm: null,
    avatarUrl: r.avatarUrl?.trim() || undefined,
  }))

  return { rows, athletes }
}
