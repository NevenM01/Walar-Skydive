import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, json, handleCors } from '../_shared/adminClient.ts'

const SETTING_RANK_WITHOUT_FAI_LICENCE = 'rank_athletes_without_fai_licence'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const auth = await requireAdmin(req)
  if (auth.error) return json({ error: auth.error }, auth.status)
  const { adminClient } = auth

  // RPC functions check auth.uid() + jwt_is_app_admin() — must use user JWT client
  const authHeader = req.headers.get('Authorization')!
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const body = await req.json()
  const { action, payload } = body

  if (action === 'upsert-rank-without-fai') {
    const { value } = payload as { value: boolean }

    const { data, error } = await adminClient
      .from('walar_app_settings')
      .upsert(
        { key: SETTING_RANK_WITHOUT_FAI_LICENCE, value: value ? 'true' : 'false', updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'recalc-one') {
    const { competition_id } = payload

    const { data, error } = await userClient
      .rpc('walar_admin_recalculate_competition', { p_competition_id: competition_id })

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'recalc-all') {
    const { data, error } = await userClient
      .rpc('walar_admin_recalculate_all_results')

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  return json({ error: `Unknown action: ${action}` }, 400)
})
