import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'
import { flagUrlFromIso2, sportCodeToIso2 } from '../_shared/countryCodes.ts'
import { forwardableAuthorizationHeader } from '../_shared/forwardableAuth.ts'

type Payload = {
  athleteId: string
  windowYears?: number
}

const AVATAR_BUCKET = 'athlete-avatars'
const AVATAR_EXPIRES_IN = 60 * 60 // 1h

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = forwardableAuthorizationHeader(req.headers.get('Authorization'))
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : {},
  )

  const body = (await req.json().catch(() => null)) as Payload | null
  if (!body?.athleteId) return json({ error: 'athleteId is required' }, 400)

  const windowYears = typeof body.windowYears === 'number' && Number.isFinite(body.windowYears) ? body.windowYears : 5

  const { data: athlete, error: aErr } = await client
    .from('athletes')
    .select(
      'id, display_name, country_code, gender, date_of_birth, fai_licence, dob_display_mode, gdpr_publish_full_name, gdpr_consent_given, bio, club, website_url, instagram_url, facebook_url, avatar_url',
    )
    .eq('id', body.athleteId)
    .maybeSingle()

  if (aErr) return json({ error: aErr.message }, 500)
  if (!athlete) return json({ data: null })

  // Public profile: must respect GDPR consent flag.
  if (!athlete.gdpr_consent_given) return json({ data: null })

  const { data: summary, error: sErr } = await client.rpc('get_athlete_public_ranking_summary', {
    p_athlete_id: body.athleteId,
    p_window_years: windowYears,
  })
  if (sErr) return json({ error: sErr.message }, 500)

  const row = (Array.isArray(summary) ? summary[0] : null) as
    | { total_points: number | string; events_count: number | string; best_round_cm: number | null }
    | null

  const sport = String(athlete.country_code ?? '').trim().toUpperCase() || 'XXX'
  const iso2 = sportCodeToIso2(sport)

  let avatarUrl: string | null = null
  const avatarPath = String(athlete.avatar_url ?? '').trim()
  if (avatarPath) {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: signed, error: signErr } = await adminClient.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, AVATAR_EXPIRES_IN)
    if (!signErr) {
      avatarUrl = signed.signedUrl
    }
  }

  return json({
    data: {
      id: athlete.id,
      displayName: athlete.display_name,
      countrySportCode: sport,
      countryIso2: iso2,
      countryFlagUrl: flagUrlFromIso2(iso2),
      gender: athlete.gender,
      dateOfBirth: athlete.date_of_birth,
      faiLicence: athlete.fai_licence,
      dobDisplayMode: athlete.dob_display_mode,
      rankingPoints: row ? Number(row.total_points) : 0,
      competitionsCount: row ? Number(row.events_count) : 0,
      bestRoundCm: row?.best_round_cm ?? null,
      avatarUrl,
      bio: athlete.bio,
      club: athlete.club,
      websiteUrl: athlete.website_url,
      instagramUrl: athlete.instagram_url,
      facebookUrl: athlete.facebook_url,
    },
  })
})

