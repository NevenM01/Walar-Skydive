import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'

type Payload = {
  athleteId: string
  kind: 'pending' | 'approved'
}

const BUCKET = 'athlete-avatars'
const EXPIRES_IN = 60 * 10 // 10 minutes

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: auth, error: authError } = await userClient.auth.getUser()
  if (authError || !auth?.user) return json({ error: 'Unauthorized' }, 401)

  const body = (await req.json().catch(() => null)) as Payload | null
  if (!body?.athleteId) return json({ error: 'athleteId is required' }, 400)
  const kind = body.kind === 'approved' ? 'approved' : 'pending'

  const { data: profile } = await userClient
    .from('profiles')
    .select('is_admin')
    .eq('id', auth.user.id)
    .maybeSingle()

  const isAdmin = Boolean(profile?.is_admin)

  const { data: athlete, error: aErr } = await userClient
    .from('athletes')
    .select('user_id, pending_avatar_path, avatar_url')
    .eq('id', body.athleteId)
    .maybeSingle()
  if (aErr) return json({ error: aErr.message }, 500)
  if (!athlete) return json({ error: 'Athlete not found' }, 404)

  const isOwner = athlete.user_id && athlete.user_id === auth.user.id
  if (!isOwner && !isAdmin) return json({ error: 'Forbidden' }, 403)

  const path =
    kind === 'pending'
      ? String(athlete.pending_avatar_path ?? '').trim()
      : String(athlete.avatar_url ?? '').trim()

  if (!path) return json({ data: { signedUrl: null } })

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await adminClient.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN)
  if (error) return json({ error: error.message }, 500)

  return json({ data: { signedUrl: data.signedUrl } })
})

