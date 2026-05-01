import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'

const AVATAR_BUCKET = 'athlete-avatars'

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

  const userId = auth.user.id

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1) Unlink athlete profile (keep ranking integrity).
  const { data: athlete, error: aErr } = await adminClient
    .from('athletes')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (aErr) return json({ error: aErr.message }, 500)

  if (athlete?.id) {
    const { error: uErr } = await adminClient
      .from('athletes')
      .update({
        user_id: null,
        avatar_url: null,
        pending_avatar_path: null,
        pending_avatar_updated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', athlete.id)
    if (uErr) return json({ error: uErr.message }, 500)
  }

  // 2) Delete avatar files (best-effort).
  const { data: files } = await adminClient.storage.from(AVATAR_BUCKET).list(userId)
  if (files?.length) {
    const paths = files.map((f) => `${userId}/${f.name}`)
    await adminClient.storage.from(AVATAR_BUCKET).remove(paths)
  }

  // 3) Delete consent logs for this user.
  await adminClient.from('cookie_consents').delete().eq('user_id', userId)

  // 4) Delete auth user (cascades profiles; athletes already unlinked).
  const { error: dErr } = await adminClient.auth.admin.deleteUser(userId)
  if (dErr) return json({ error: dErr.message }, 500)

  return json({ data: { deleted: true } })
})

