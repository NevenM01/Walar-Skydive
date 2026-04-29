import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, json, handleCors } from '../_shared/adminClient.ts'
import { iso2ToSportCode } from '../_shared/countryCodes.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const body = await req.json()
  const { action, payload } = body

  // update-my-profile: korisnik mjenja vlastiti profil — koristi korisnikov JWT (RLS na user_id)
  if (action === 'update-my-profile') {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { athleteId, bio, club, website_url, instagram_url, facebook_url, pending_avatar_path } = payload
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (bio !== undefined) updateData.bio = bio
    if (club !== undefined) updateData.club = club
    if (website_url !== undefined) updateData.website_url = website_url
    if (instagram_url !== undefined) updateData.instagram_url = instagram_url
    if (facebook_url !== undefined) updateData.facebook_url = facebook_url
    if (pending_avatar_path !== undefined) {
      updateData.pending_avatar_path = pending_avatar_path
      updateData.pending_avatar_updated_at = new Date().toISOString()
    }

    const { data, error } = await userClient
      .from('athletes')
      .update(updateData)
      .eq('id', athleteId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  // Sve ostalo zahtijeva admin
  const auth = await requireAdmin(req)
  if (auth.error) return json({ error: auth.error }, auth.status)
  const { adminClient, userId: adminUserId } = auth

  if (action === 'approve-avatar') {
    const { athleteId } = payload as { athleteId: string }
    if (!athleteId) return json({ error: 'athleteId is required' }, 400)

    const { data: a, error: aErr } = await adminClient
      .from('athletes')
      .select('pending_avatar_path')
      .eq('id', athleteId)
      .single()
    if (aErr) return json({ error: aErr.message }, 500)

    const pendingPath = (a?.pending_avatar_path ?? '').toString().trim()
    if (!pendingPath) return json({ error: 'No pending avatar to approve' }, 400)

    const { data, error } = await adminClient
      .from('athletes')
      .update({
        avatar_url: pendingPath,
        pending_avatar_path: null,
        pending_avatar_updated_at: null,
        avatar_approved_at: new Date().toISOString(),
        avatar_approved_by: adminUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', athleteId)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'reject-avatar') {
    const { athleteId } = payload as { athleteId: string }
    if (!athleteId) return json({ error: 'athleteId is required' }, 400)

    const { data, error } = await adminClient
      .from('athletes')
      .update({
        pending_avatar_path: null,
        pending_avatar_updated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', athleteId)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'update') {
    const {
      id, display_name, country_code, gender, date_of_birth,
      fai_licence, dob_display_mode, gdpr_consent_given,
      gdpr_publish_full_name, user_id
    } = payload

    const rawCountry = String(country_code ?? '').trim()
    const { data: normIso2, error: normErr } = await adminClient.rpc('normalize_country_to_iso2', { raw: rawCountry })
    if (normErr) return json({ error: `country_code normalize failed: ${normErr.message}` }, 500)
    if (!normIso2) return json({ error: `Unknown country_code "${rawCountry}"` }, 400)
    const sport3 = iso2ToSportCode(String(normIso2))

    const { data, error } = await adminClient
      .from('athletes')
      .update({
        display_name,
        country_code: sport3,
        gender,
        date_of_birth: date_of_birth ?? null,
        fai_licence: fai_licence ?? null,
        dob_display_mode: dob_display_mode ?? 'hidden',
        gdpr_consent_given: gdpr_consent_given ?? false,
        gdpr_publish_full_name: gdpr_publish_full_name ?? false,
        user_id: user_id ?? null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'delete') {
    const { id } = payload
    const { error } = await adminClient
      .from('athletes')
      .delete()
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)
    return json({ success: true })
  }

  return json({ error: `Unknown action: ${action}` }, 400)
})
