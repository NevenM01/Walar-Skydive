import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/adminClient.ts'
import { toPublicAthleteDisplay } from '../_shared/athletePrivacy.ts'

type Payload = {
  query?: string
  limit?: number
}

const MIN_CHARS = 3
const RESULT_LIMIT = 10
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

type Bucket = { count: number; resetAt: number }
const hits = new Map<string, Bucket>()

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('cf-connecting-ip')?.trim() || req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const cur = hits.get(ip)
  if (!cur || now >= cur.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  cur.count += 1
  return cur.count > RATE_LIMIT
}

function escapeIlike(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (rateLimited(clientIp(req))) {
    return json({ error: 'Too many requests' }, 429)
  }

  const body = (await req.json().catch(() => null)) as Payload | null
  const q = String(body?.query ?? '').trim()
  if (q.length < MIN_CHARS) return json({ data: [] })

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await serviceClient
    .from('athletes')
    .select('id, display_name, country_code, gdpr_publish_full_name')
    .ilike('display_name', `%${escapeIlike(q)}%`)
    .order('display_name', { ascending: true })
    .limit(RESULT_LIMIT)

  if (error) return json({ error: error.message }, 500)

  const out = ((data ?? []) as Array<{
    id: string
    display_name: string
    country_code: string
    gdpr_publish_full_name: boolean | null
  }>).map((row) => {
    const shown = toPublicAthleteDisplay({
      displayName: row.display_name,
      publishFullName: Boolean(row.gdpr_publish_full_name),
    })
    return {
      id: row.id,
      displayName: shown.displayName,
      countryCode: String(row.country_code ?? '').trim().toUpperCase() || 'XXX',
    }
  })

  return json({ data: out })
})
