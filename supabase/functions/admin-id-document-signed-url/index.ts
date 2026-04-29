import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, json, handleCors } from '../_shared/adminClient.ts'

type Payload = { path: string }

const BUCKET = 'athlete-id-documents'
const EXPIRES_IN = 60 * 10

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin(req)
  if (auth.error) return json({ error: auth.error }, auth.status)

  const body = (await req.json().catch(() => null)) as Payload | null
  const path = String(body?.path ?? '').trim()
  if (!path) return json({ error: 'path is required' }, 400)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await adminClient.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN)
  if (error) return json({ error: error.message }, 500)

  return json({ data: { signedUrl: data.signedUrl } })
})

