import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'
import { flagUrlFromIso2, sportCodeToIso2 } from '../_shared/countryCodes.ts'

type Payload = {
  gender?: string
  competitionId?: string | null
  windowYears?: number
  licence?: 'all' | 'fai_only'
  seasonStart?: string | null   // YYYY-MM-DD, e.g. '2025-01-01' for season filter
  seasonEnd?: string | null     // YYYY-MM-DD, e.g. '2025-12-31' for season filter
}

const AVATAR_BUCKET = 'athlete-avatars'
const AVATAR_EXPIRES_IN = 60 * 60 // 1h

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : {},
  )

  const body = (await req.json().catch(() => ({}))) as Payload
  const gender = (body.gender ?? 'all').toString()
  const competitionId = body.competitionId ?? null
  const windowYears = typeof body.windowYears === 'number' && Number.isFinite(body.windowYears) ? body.windowYears : 5
  const licence = body.licence === 'fai_only' || body.licence === 'all' ? body.licence : null
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
  })

  if (error) return json({ error: error.message }, 500)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const rows = (data ?? []) as Array<{
    athlete_id: string
    total_points: number | string
    events_count: number | string
    display_name: string
    country_code: string
    gender: string
    avatar_url?: string | null
  }>

  const out = await Promise.all(rows.map(async (r) => {
    const sport = String(r.country_code ?? '').trim().toUpperCase() || 'XXX'
    const iso2 = sportCodeToIso2(sport)

    let avatarUrl: string | null = null
    const avatarPath = String(r.avatar_url ?? '').trim()
    if (avatarPath) {
      const { data: signed, error: signErr } = await adminClient.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(avatarPath, AVATAR_EXPIRES_IN)
      if (!signErr) avatarUrl = signed.signedUrl
    }

    return {
      athleteId: r.athlete_id,
      totalPoints: Number(r.total_points),
      eventsCount: Number(r.events_count),
      displayName: r.display_name,
      gender: r.gender,
      avatarUrl,
      countrySportCode: sport,
      countryIso2: iso2,
      countryFlagUrl: flagUrlFromIso2(iso2),
    }
  }))

  return json({ data: out })
})

