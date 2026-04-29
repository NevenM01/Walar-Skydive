import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

type AdminResult =
  | { adminClient: SupabaseClient; userId: string; error: null }
  | { adminClient: null; userId: null; error: string; status: number }

export async function requireAdmin(req: Request): Promise<AdminResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { adminClient: null, userId: null, error: 'Missing Authorization header', status: 401 }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return { adminClient: null, userId: null, error: 'Unauthorized', status: 401 }

  const { data: profile } = await userClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { adminClient: null, userId: null, error: 'Forbidden', status: 403 }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  return { adminClient, userId: user.id, error: null }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    })
  }
  return null
}
