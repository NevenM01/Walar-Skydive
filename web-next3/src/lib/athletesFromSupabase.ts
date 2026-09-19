import type { Athlete, Competition } from '../types'
import { getSupabaseAnonPublicClient, getSupabaseBrowserClient } from './supabaseClient'
import { WALAR_RANKING_WINDOW_YEARS } from './walarConstants'
import { normalizeUnicodeForDisplay } from './unicodeAthleteDisplay'

type AthleteRow = {
  id: string
  user_id: string | null
  display_name: string
  country_code: string
  gender: 'M' | 'F'
  date_of_birth: string | null
  fai_licence: string | null
  dob_display_mode: 'age' | 'date'
  gdpr_publish_full_name: boolean
  gdpr_consent_given: boolean
  bio: string | null
  club: string | null
  website_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  avatar_url: string | null
  pending_avatar_path: string | null
  pending_avatar_updated_at: string | null
}

function mapAthleteRow(row: AthleteRow): Athlete {
  const avatarPath = row.avatar_url?.trim() || null
  return {
    id: row.id,
    userId: row.user_id ?? null,
    displayName: normalizeUnicodeForDisplay(row.display_name),
    countryCode: row.country_code,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    faiLicence: row.fai_licence,
    dobDisplayMode: row.dob_display_mode,
    rankingPoints: 0,
    gdprFlags: {
      publishFullName: Boolean(row.gdpr_publish_full_name),
      consentGiven: Boolean(row.gdpr_consent_given),
    },
    competitionsCount: 0,
    bestRoundCm: null,
    bio: row.bio ?? null,
    club: row.club ?? null,
    websiteUrl: row.website_url ?? null,
    instagramUrl: row.instagram_url ?? null,
    facebookUrl: row.facebook_url ?? null,
    avatarUrl: avatarPath && /^https?:\/\//i.test(avatarPath) ? avatarPath : undefined,
    avatarPath: avatarPath && !/^https?:\/\//i.test(avatarPath) ? avatarPath : (avatarPath || null),
    pendingAvatarPath: row.pending_avatar_path?.trim() || null,
    pendingAvatarUpdatedAt: row.pending_avatar_updated_at,
  }
}

const ATHLETE_SELECT =
  'id, user_id, display_name, country_code, gender, date_of_birth, fai_licence, dob_display_mode, gdpr_publish_full_name, gdpr_consent_given, bio, club, website_url, instagram_url, facebook_url, avatar_url, pending_avatar_path, pending_avatar_updated_at' as const

export async function fetchAthleteByIdFromSupabase(id: string): Promise<Athlete | null> {
  const sb = getSupabaseAnonPublicClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data: res, error } = await sb.functions.invoke('public-athlete', {
    body: { athleteId: id, windowYears: WALAR_RANKING_WINDOW_YEARS },
  })
  if (error) throw new Error(error.message)
  if (!res?.data) return null

  const a = res.data as {
    id: string
    displayName: string
    countrySportCode: string
    gender: 'M' | 'F'
    age: number | null
    faiLicence: string | null
    gdprPublishFullName?: boolean
    gdprConsentGiven?: boolean
    rankingPoints: number
    competitionsCount: number
    bestRoundCm: number | null
    avatarUrl: string | null
    bio: string | null
    club: string | null
    websiteUrl: string | null
    instagramUrl: string | null
    facebookUrl: string | null
  }

  return {
    id: a.id,
    userId: null,
    displayName: normalizeUnicodeForDisplay(a.displayName),
    countryCode: a.countrySportCode,
    gender: a.gender,
    dateOfBirth: null,
    age: a.age ?? null,
    faiLicence: a.faiLicence,
    dobDisplayMode: 'age',
    rankingPoints: Number(a.rankingPoints),
    gdprFlags: {
      publishFullName: Boolean(a.gdprPublishFullName),
      consentGiven: a.gdprConsentGiven !== false,
    },
    competitionsCount: Number(a.competitionsCount),
    bestRoundCm: a.bestRoundCm != null ? Number(a.bestRoundCm) : null,
    bio: a.bio ?? null,
    club: a.club ?? null,
    websiteUrl: a.websiteUrl ?? null,
    instagramUrl: a.instagramUrl ?? null,
    facebookUrl: a.facebookUrl ?? null,
    avatarUrl: a.avatarUrl?.trim() || undefined,
  }
}

export async function fetchAthletesFromSupabase(): Promise<Athlete[]> {
  const sb = getSupabaseAnonPublicClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await sb
    .from('athletes')
    .select(ATHLETE_SELECT)
    .order('display_name', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as AthleteRow[]).map(mapAthleteRow)
}

/** Athletes with `user_id` set (linked Supabase auth account). Uses exact count only; no row payload. */
export async function fetchLinkedProfileAthletesCountFromSupabase(): Promise<number> {
  const sb = getSupabaseAnonPublicClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const rpc = await sb.rpc('count_linked_athlete_profiles')
  if (!rpc.error && rpc.data != null) {
    const n = Number(rpc.data)
    if (Number.isFinite(n)) return n
  }
  const { error, count } = await sb
    .from('athletes')
    .select('id', { count: 'exact', head: true })
    .not('user_id', 'is', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export type PublicAthleteSearchHit = { id: string; displayName: string; countryCode: string }

export async function searchPublicAthletesFromSupabase(query: string): Promise<PublicAthleteSearchHit[]> {
  const sb = getSupabaseAnonPublicClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const q = query.trim()
  if (q.length < 3) return []
  const { data: res, error } = await sb.functions.invoke('public-athlete-search', {
    body: { query: q, limit: 10 },
  })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(String(res.error))
  const rows = (res?.data ?? []) as PublicAthleteSearchHit[]
  return rows.map((r) => ({
    id: r.id,
    displayName: normalizeUnicodeForDisplay(r.displayName),
    countryCode: r.countryCode,
  }))
}

export type AthletesPageQuery = {
  query?: string
  offset: number
  limit: number
}

export async function fetchAthletesPageFromSupabase(
  params: AthletesPageQuery,
): Promise<{ rows: Athlete[]; total: number }> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }

  const q = params.query?.trim() ?? ''
  const from = Math.max(0, params.offset)
  const to = Math.max(from, from + Math.max(1, params.limit) - 1)

  let req = sb
    .from('athletes')
    .select(ATHLETE_SELECT, { count: 'exact' })
    .order('display_name', { ascending: true })

  if (q) {
    req = req.ilike('display_name', `%${q}%`)
  }

  const { data, error, count } = await req.range(from, to)
  if (error) throw new Error(error.message)

  return {
    rows: ((data ?? []) as AthleteRow[]).map(mapAthleteRow),
    total: count ?? 0,
  }
}

export async function fetchMyAthleteFromSupabase(userId: string): Promise<Athlete | null> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await sb.from('athletes').select(ATHLETE_SELECT).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapAthleteRow(data as AthleteRow)
}

export type AthleteProfileUpdatePayload = {
  bio?: string | null
  club?: string | null
  websiteUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  pendingAvatarPath?: string | null
}

export async function updateMyAthleteProfileInSupabase(
  athleteId: string,
  payload: AthleteProfileUpdatePayload,
): Promise<Athlete> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-athlete-write', {
    body: {
      action: 'update-my-profile',
      payload: {
        athleteId,
        bio: payload.bio,
        club: payload.club,
        website_url: payload.websiteUrl,
        instagram_url: payload.instagramUrl,
        facebook_url: payload.facebookUrl,
        pending_avatar_path: payload.pendingAvatarPath,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapAthleteRow(result.data as AthleteRow)
}

export type AthleteUpsertPayload = {
  displayName: string
  countryCode: string
  gender: 'M' | 'F'
  dateOfBirth: string | null
  faiLicence: string | null
  dobDisplayMode: 'age' | 'date'
  gdprPublishFullName: boolean
  gdprConsentGiven: boolean
  userId?: string | null
}

export async function updateAthleteInSupabase(
  id: string,
  payload: AthleteUpsertPayload,
): Promise<Athlete> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-athlete-write', {
    body: {
      action: 'update',
      payload: {
        id,
        display_name: payload.displayName.trim(),
        country_code: payload.countryCode.trim().toUpperCase(),
        gender: payload.gender,
        date_of_birth: payload.dateOfBirth ?? null,
        fai_licence: payload.faiLicence?.trim() ?? null,
        dob_display_mode: payload.dobDisplayMode,
        gdpr_publish_full_name: payload.gdprPublishFullName,
        gdpr_consent_given: payload.gdprConsentGiven,
        user_id: payload.userId ?? null,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapAthleteRow(result.data as AthleteRow)
}

export async function deleteAthleteInSupabase(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-athlete-write', {
    body: { action: 'delete', payload: { id } },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
}

type CompetitionJoinRow = {
  competition:
    | {
    id: string
    name: string
    start_date: string
    end_date: string
    location: string
    category: string
    status: Competition['status']
    fai_class: string | null
    description: string | null
    unique_label: string | null
    }
    | Array<{
        id: string
        name: string
        start_date: string
        end_date: string
        location: string
        category: string
        status: Competition['status']
        fai_class: string | null
        description: string | null
        unique_label: string | null
      }>
    | null
}

export async function fetchCompetitionsForAthleteFromSupabase(
  athleteId: string,
): Promise<Competition[]> {
  const sb = getSupabaseAnonPublicClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await sb
    .from('competition_results')
    .select(
      'competition:competitions(id, name, start_date, end_date, location, category, status, fai_class, description, unique_label)',
    )
    .eq('athlete_id', athleteId)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as CompetitionJoinRow[]
  return rows
    .flatMap((r) => {
      const c = r.competition
      if (!c) return []
      return Array.isArray(c) ? c : [c]
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.start_date,
      endDate: c.end_date,
      location: c.location,
      category: c.category,
      status: c.status,
      faiClass: c.fai_class ?? undefined,
      description: c.description ?? undefined,
      uniqueLabel: c.unique_label ?? undefined,
    }))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
}

