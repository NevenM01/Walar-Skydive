import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'

type Payload = {
  email: string
  athleteId?: string | null
  athleteSearchText?: string | null
  manualFullName?: string | null
  manualCountryCode?: string | null
  manualFaiLicence?: string | null
  manualYearOfBirth?: number | null
  idDocumentPath?: string | null
  message?: string | null
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function isLikelyEmail(v: string): boolean {
  // Lightweight validation; real verification happens via email ownership.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const body = (await req.json().catch(() => null)) as Payload | null
  if (!body) return json({ error: 'Invalid JSON body' }, 400)

  const email = normalizeEmail(String(body.email ?? ''))
  if (!email || !isLikelyEmail(email) || email.length > 320) {
    return json({ error: 'Valid email is required' }, 400)
  }

  const athleteId = (body.athleteId ?? null)?.toString().trim() || null
  const athleteSearchText = (body.athleteSearchText ?? null)?.toString().trim() || null
  const manualFullName = (body.manualFullName ?? null)?.toString().trim() || null
  const manualCountryCode = (body.manualCountryCode ?? null)?.toString().trim() || null
  const manualFaiLicence = (body.manualFaiLicence ?? null)?.toString().trim() || null
  const manualYearOfBirth =
    typeof body.manualYearOfBirth === 'number' && Number.isFinite(body.manualYearOfBirth)
      ? Math.trunc(body.manualYearOfBirth)
      : null
  const idDocumentPath = (body.idDocumentPath ?? null)?.toString().trim() || null
  const message = (body.message ?? null)?.toString().trim() || null

  if (message && message.length > 1200) return json({ error: 'Message is too long' }, 400)
  if (athleteSearchText && athleteSearchText.length > 200) return json({ error: 'Search text is too long' }, 400)
  if (manualFullName && manualFullName.length > 140) return json({ error: 'Full name is too long' }, 400)
  if (manualCountryCode && manualCountryCode.length > 16) return json({ error: 'Country code is too long' }, 400)
  if (manualFaiLicence && manualFaiLicence.length > 40) return json({ error: 'FAI licence is too long' }, 400)
  if (manualYearOfBirth != null && (manualYearOfBirth < 1900 || manualYearOfBirth > new Date().getFullYear())) {
    return json({ error: 'Year of birth is invalid' }, 400)
  }

  const hasManual = Boolean(manualFullName || manualCountryCode || manualFaiLicence || manualYearOfBirth != null)
  if (!athleteId && !hasManual) {
    return json({ error: 'Provide athleteId or manual identification details' }, 400)
  }

  if (!idDocumentPath) {
    return json({ error: 'ID document is required' }, 400)
  }

  if (athleteId) {
    const { data: athlete, error: aErr } = await sb
      .from('athletes')
      .select('id')
      .eq('id', athleteId)
      .maybeSingle()
    if (aErr) return json({ error: aErr.message }, 500)
    if (!athlete) return json({ error: 'Athlete not found' }, 400)
  }

  const { data, error } = await sb
    .from('athlete_profile_edit_requests')
    .insert({
      status: 'pending',
      email,
      athlete_id: athleteId,
      athlete_search_text: athleteSearchText,
      manual_full_name: manualFullName,
      manual_country_code: manualCountryCode,
      manual_fai_licence: manualFaiLicence,
      manual_year_of_birth: manualYearOfBirth,
      id_document_path: idDocumentPath,
      message,
    })
    .select('id, status, created_at')
    .single()

  if (error) return json({ error: error.message }, 500)
  return json({ data })
})

