import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'

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

  const user = auth.user

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const [profileRes, athleteRes, consentsRes, requestsRes] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    adminClient.from('athletes').select('*').eq('user_id', user.id).maybeSingle(),
    adminClient.from('cookie_consents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    adminClient
      .from('athlete_profile_edit_requests')
      .select('*')
      .or(`linked_user_id.eq.${user.id},email.eq.${(user.email ?? '').toLowerCase()}`),
  ])

  if (profileRes.error) return json({ error: profileRes.error.message }, 500)
  if (athleteRes.error) return json({ error: athleteRes.error.message }, 500)
  if (consentsRes.error) return json({ error: consentsRes.error.message }, 500)
  if (requestsRes.error) return json({ error: requestsRes.error.message }, 500)

  return json({
    data: {
      generatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email ?? null,
        created_at: (user as any).created_at ?? null,
        last_sign_in_at: (user as any).last_sign_in_at ?? null,
      },
      profile: profileRes.data ?? null,
      athlete: athleteRes.data ?? null,
      cookieConsents: consentsRes.data ?? [],
      profileEditRequests: requestsRes.data ?? [],
    },
  })
})

