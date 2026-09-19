import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'
import { ageFromDob, toPublicAthleteDisplay } from '../_shared/athletePrivacy.ts'
import { flagUrlFromIso2, sportCodeToIso2 } from '../_shared/countryCodes.ts'

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

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const body = (await req.json().catch(() => null)) as Payload | null
  if (!body?.athleteId) return json({ error: 'athleteId is required' }, 400)

  const windowYears = typeof body.windowYears === 'number' && Number.isFinite(body.windowYears) ? body.windowYears : 5

  const { data: athlete, error: aErr } = await serviceClient
    .from('athletes')
    .select(
      'id, display_name, country_code, gender, date_of_birth, fai_licence, gdpr_publish_full_name, gdpr_consent_given, bio, club, website_url, instagram_url, facebook_url, avatar_url',
    )
    .eq('id', body.athleteId)
    .maybeSingle()

  if (aErr) {
    console.error('public-athlete select', aErr.message)
    return json({ error: 'Internal error' }, 500)
  }
  if (!athlete) return json({ data: null })

  if (!athlete.gdpr_consent_given) return json({ data: null })

  const { data: summary, error: sErr } = await serviceClient.rpc('get_athlete_public_ranking_summary', {
    p_athlete_id: body.athleteId,
    p_window_years: windowYears,
  })
  if (sErr) {
    console.error('public-athlete ranking summary', sErr.message)
    return json({ error: 'Internal error' }, 500)
  }

  const row = (Array.isArray(summary) ? summary[0] : null) as
    | { total_points: number | string; events_count: number | string; best_round_cm: number | null }
    | null

  const sport = String(athlete.country_code ?? '').trim().toUpperCase() || 'XXX'
  const iso2 = sportCodeToIso2(sport)
  const publishFullName = Boolean(athlete.gdpr_publish_full_name)

  let signedAvatar: string | null = null
  const avatarPath = String(athlete.avatar_url ?? '').trim()
  if (publishFullName && avatarPath) {
    const { data: signed, error: signErr } = await serviceClient.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, AVATAR_EXPIRES_IN)
    if (!signErr) {
      signedAvatar = signed.signedUrl
    }
  }

  const shown = toPublicAthleteDisplay({
    displayName: athlete.display_name,
    publishFullName,
    avatarUrl: signedAvatar,
    faiLicence: athlete.fai_licence,
  })

  return json({
    data: {
      id: athlete.id,
      displayName: shown.displayName,
      countrySportCode: sport,
      countryIso2: iso2,
      countryFlagUrl: flagUrlFromIso2(iso2),
      gender: athlete.gender,
      age: ageFromDob(athlete.date_of_birth),
      faiLicence: shown.faiLicence,
      gdprPublishFullName: publishFullName,
      gdprConsentGiven: true,
      rankingPoints: row ? Number(row.total_points) : 0,
      competitionsCount: row ? Number(row.events_count) : 0,
      bestRoundCm: row?.best_round_cm ?? null,
      avatarUrl: shown.avatarUrl,
      bio: athlete.bio,
      club: athlete.club,
      websiteUrl: athlete.website_url,
      instagramUrl: athlete.instagram_url,
      facebookUrl: athlete.facebook_url,
    },
  })
})
