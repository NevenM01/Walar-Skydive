import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'
import {
  mapPublicLeaderboardRow,
  type LeaderboardPrivacyRow,
} from '../_shared/athletePrivacy.ts'
import { flagUrlFromIso2, sportCodeToIso2 } from '../_shared/countryCodes.ts'
import { forwardableAuthorizationHeader } from '../_shared/forwardableAuth.ts'

type Payload = {
  gender?: string
  competitionId?: string | null
  windowYears?: number
  licence?: 'all' | 'fai_only'
  seasonStart?: string | null
  seasonEnd?: string | null
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const serviceClient = createClient(supabaseUrl, serviceKey)

  const body = (await req.json().catch(() => ({}))) as Payload
  const gender = (body.gender ?? 'all').toString()
  const competitionId = body.competitionId ?? null
  const windowYears = typeof body.windowYears === 'number' && Number.isFinite(body.windowYears) ? body.windowYears : 5
  const licence = body.licence === 'fai_only' || body.licence === 'all' ? body.licence : null
  const offset = clampInt(body.offset, 0, 0, 1_000_000)
  const limit = clampInt(body.limit, 100, 1, 500)
  const seasonStart =
    typeof body.seasonStart === 'string' && body.seasonStart.trim() !== '' ? body.seasonStart.trim() : null
  const seasonEnd =
    typeof body.seasonEnd === 'string' && body.seasonEnd.trim() !== '' ? body.seasonEnd.trim() : null

  const rpcArgs = {
    p_gender: gender,
    p_competition_id: competitionId,
    p_window_years: windowYears,
    p_licence: licence,
    p_season_start: seasonStart,
    p_season_end: seasonEnd,
    p_offset: offset,
    p_limit: limit,
  }

  let { data, error } = await serviceClient.rpc('get_leaderboard', rpcArgs)
  if (error) {
    const authHeader = forwardableAuthorizationHeader(req.headers.get('Authorization'))
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {},
    )
    const retry = await anonClient.rpc('get_leaderboard', rpcArgs)
    data = retry.data
    error = retry.error
  }

  if (error) {
    console.error('public-leaderboard get_leaderboard', error.message)
    return json({ error: 'Internal error' }, 500)
  }

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

  const ids = [...new Set(rows.map((r) => r.athlete_id).filter(Boolean))]
  const privacyById = new Map<string, LeaderboardPrivacyRow>()
  const PRIVACY_BATCH = 100
  for (let i = 0; i < ids.length; i += PRIVACY_BATCH) {
    const chunk = ids.slice(i, i + PRIVACY_BATCH)
    const { data: privacyRows, error: pErr } = await serviceClient
      .from('athletes')
      .select('id, gdpr_publish_full_name, avatar_url, fai_licence, date_of_birth')
      .in('id', chunk)
    if (pErr) {
      console.error('public-leaderboard privacy lookup', pErr.message)
      return json({ error: 'Internal error' }, 500)
    }
    for (const row of (privacyRows ?? []) as LeaderboardPrivacyRow[]) {
      privacyById.set(row.id, row)
    }
  }

  const out = rows.map((r) => {
    const sport = String(r.country_code ?? '').trim().toUpperCase() || 'XXX'
    const iso2 = sportCodeToIso2(sport)
    const privacy = privacyById.get(r.athlete_id)
    return mapPublicLeaderboardRow(
      {
        rank: Number(r.rank),
        athleteId: r.athlete_id,
        totalPoints: Number(r.total_points),
        eventsCount: Number(r.events_count),
        displayName: r.display_name,
        gender: r.gender,
        countrySportCode: sport,
        countryIso2: iso2,
        countryFlagUrl: flagUrlFromIso2(iso2),
      },
      privacy
        ? { ...privacy, avatar_url: avatarPublicUrl(supabaseUrl, privacy.avatar_url) }
        : undefined,
    )
  })

  return json({ data: out })
})
