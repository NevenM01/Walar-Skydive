import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'
import { flagUrlFromIso2, sportCodeToIso2 } from '../_shared/countryCodes.ts'
import { forwardableAuthorizationHeader } from '../_shared/forwardableAuth.ts'

type Payload = {
  gender?: string
  competitionId?: string | null
  windowYears?: number
  licence?: 'all' | 'fai_only'
  seasonStart?: string | null   // YYYY-MM-DD, e.g. '2025-01-01' for season filter
  seasonEnd?: string | null     // YYYY-MM-DD, e.g. '2025-12-31' for season filter
  offset?: number
  limit?: number
}

const AVATAR_BUCKET = 'athlete-avatars'

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function encodeStoragePath(path: string): string {
  return path
    .split('/')
    .filter((x) => x.length > 0)
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

function avatarPublicUrl(supabaseUrl: string, avatarUrlOrPath: string | null | undefined): string | null {
  const v = String(avatarUrlOrPath ?? '').trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  const base = supabaseUrl.replace(/\/+$/g, '')
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${encodeStoragePath(v)}`
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = forwardableAuthorizationHeader(req.headers.get('Authorization'))
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const client = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : {},
  )

  const body = (await req.json().catch(() => ({}))) as Payload
  const gender = (body.gender ?? 'all').toString()
  const competitionId = body.competitionId ?? null
  const windowYears = typeof body.windowYears === 'number' && Number.isFinite(body.windowYears) ? body.windowYears : 5
  const licence = body.licence === 'fai_only' || body.licence === 'all' ? body.licence : null
  const offset = clampInt(body.offset, 0, 0, 1_000_000)
  const limit = clampInt(body.limit, 100, 1, 500)
  // Always pass explicit nulls (not empty strings) to avoid overload ambiguity and date casts.
  const seasonStart =
    typeof body.seasonStart === 'string' && body.seasonStart.trim() !== '' ? body.seasonStart.trim() : null
  const seasonEnd =
    typeof body.seasonEnd === 'string' && body.seasonEnd.trim() !== '' ? body.seasonEnd.trim() : null

  const { data, error } = await client.rpc('get_leaderboard', {
    p_gender: gender,
    p_competition_id: competitionId,
    p_window_years: windowYears,
    p_licence: licence,
    p_season_start: seasonStart,
    p_season_end: seasonEnd,
    p_offset: offset,
    p_limit: limit,
  })

  if (error) return json({ error: error.message }, 500)

  const rows = (data ?? []) as Array<{
    rank: number | string
    athlete_id: string
    total_points: number | string
    events_count: number | string
    display_name: string
    country_code: string
    gender: string
    avatar_url?: string | null
  }>

  const out = rows.map((r) => {
    const sport = String(r.country_code ?? '').trim().toUpperCase() || 'XXX'
    const iso2 = sportCodeToIso2(sport)

    return {
      rank: Number(r.rank),
      athleteId: r.athlete_id,
      totalPoints: Number(r.total_points),
      eventsCount: Number(r.events_count),
      displayName: r.display_name,
      gender: r.gender,
      avatarUrl: avatarPublicUrl(supabaseUrl, r.avatar_url),
      countrySportCode: sport,
      countryIso2: iso2,
      countryFlagUrl: flagUrlFromIso2(iso2),
    }
  })

  return json({ data: out })
})

