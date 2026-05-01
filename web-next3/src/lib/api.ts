import type {
  Athlete,
  Competition,
  LeaderboardFilters,
  LeaderboardRow,
  NewsPost,
  NewsPostAdmin,
  ProjectPartner,
} from '../types'
import {
  fetchCompetitionByIdFromSupabase,
  fetchCompetitionsFromSupabase,
} from './competitionsFromSupabase'
import { fetchLeaderboardFromSupabase } from './leaderboardFromSupabase'
import {
  fetchHomepageNewsStripFromSupabase,
  fetchNewsPostByIdFromSupabase,
  fetchNewsPostsForAdminFromSupabase,
  fetchNewsPostsFromSupabase,
} from './newsFromSupabase'
import { isSupabaseConfigured } from './supabaseClient'
import {
  fetchAthleteByIdFromSupabase,
  fetchAthletesFromSupabase,
  fetchAthletesPageFromSupabase,
  fetchCompetitionsForAthleteFromSupabase,
  fetchLinkedProfileAthletesCountFromSupabase,
  deleteAthleteInSupabase,
  updateAthleteInSupabase,
  type AthleteUpsertPayload,
} from './athletesFromSupabase'
import { fetchProjectPartnersFromSupabase } from './partnersFromSupabase'

const SUPABASE_NOT_CONFIGURED =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'

export async function getLeaderboard(filters: LeaderboardFilters): Promise<{
  rows: LeaderboardRow[]
  athletes: Athlete[]
}> {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_NOT_CONFIGURED)
  }
  return fetchLeaderboardFromSupabase(filters)
}

export type LeaderboardPageParams = {
  page: number
  pageSize: number
}

export async function getLeaderboardPage(
  filters: LeaderboardFilters,
  page: LeaderboardPageParams,
): Promise<{ rows: LeaderboardRow[]; athletes: Athlete[] }> {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_NOT_CONFIGURED)
  }
  const pageNum = Math.max(1, Math.trunc(page.page))
  const pageSize = Math.min(500, Math.max(1, Math.trunc(page.pageSize)))
  const offset = (pageNum - 1) * pageSize
  return fetchLeaderboardFromSupabase(filters, { offset, limit: pageSize })
}

export async function getLinkedProfileAthletesCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  return fetchLinkedProfileAthletesCountFromSupabase()
}

export async function getEvents(): Promise<Competition[]> {
  if (!isSupabaseConfigured()) return []
  return fetchCompetitionsFromSupabase()
}

export async function getEvent(id: string): Promise<Competition | null> {
  if (!isSupabaseConfigured()) return null
  return fetchCompetitionByIdFromSupabase(id)
}

export async function getNewsPosts(): Promise<NewsPost[]> {
  if (!isSupabaseConfigured()) return []
  return fetchNewsPostsFromSupabase()
}

export async function getHomepageNewsPosts(): Promise<NewsPost[]> {
  if (!isSupabaseConfigured()) return []
  return fetchHomepageNewsStripFromSupabase()
}

export async function getNewsPost(id: string): Promise<NewsPost | null> {
  if (!isSupabaseConfigured()) return null
  return fetchNewsPostByIdFromSupabase(id)
}

export async function getNewsPostsForAdmin(): Promise<NewsPostAdmin[]> {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_NOT_CONFIGURED)
  }
  return fetchNewsPostsForAdminFromSupabase()
}

export async function getAthlete(id: string): Promise<Athlete | null> {
  if (!isSupabaseConfigured()) return null
  return fetchAthleteByIdFromSupabase(id)
}

export async function getAthletes(): Promise<Athlete[]> {
  if (!isSupabaseConfigured()) return []
  return fetchAthletesFromSupabase()
}

export type AthletesPageParams = {
  query?: string
  page: number
  pageSize: number
}

export async function getAthletesPage(
  params: AthletesPageParams,
): Promise<{ rows: Athlete[]; total: number }> {
  if (!isSupabaseConfigured()) return { rows: [], total: 0 }
  const page = Math.max(1, params.page)
  const pageSize = Math.max(1, params.pageSize)
  const offset = (page - 1) * pageSize
  return fetchAthletesPageFromSupabase({ query: params.query, offset, limit: pageSize })
}

export async function updateAthlete(id: string, payload: AthleteUpsertPayload): Promise<Athlete> {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_NOT_CONFIGURED)
  }
  return updateAthleteInSupabase(id, payload)
}

export async function deleteAthlete(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  return deleteAthleteInSupabase(id)
}

export async function getAthleteCompetitions(athleteId: string): Promise<Competition[]> {
  if (!isSupabaseConfigured()) return []
  return fetchCompetitionsForAthleteFromSupabase(athleteId)
}

export async function getCompetitionsForAdmin(): Promise<Competition[]> {
  if (!isSupabaseConfigured()) return []
  return fetchCompetitionsFromSupabase()
}

export async function getProjectPartners(): Promise<ProjectPartner[]> {
  if (!isSupabaseConfigured()) return []
  return fetchProjectPartnersFromSupabase()
}

