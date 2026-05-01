import { requireAdmin, json, handleCors } from '../_shared/adminClient.ts'

type Payload = { requestId: string }

const BUCKET = 'athlete-id-documents'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin(req)
  if (auth.error) return json({ error: auth.error }, auth.status)
  const { adminClient } = auth

  const body = (await req.json().catch(() => null)) as Payload | null
  const requestId = String(body?.requestId ?? '').trim()
  if (!requestId) return json({ error: 'requestId is required' }, 400)

  const { data: row, error: rErr } = await adminClient
    .from('athlete_profile_edit_requests')
    .select('id, id_document_path')
    .eq('id', requestId)
    .single()
  if (rErr) return json({ error: rErr.message }, 500)
  if (!row) return json({ error: 'Request not found' }, 404)

  const path = String((row as any).id_document_path ?? '').trim()
  if (!path) {
    return json({ data: { deleted: false } })
  }

  const { error: dErr } = await adminClient.storage.from(BUCKET).remove([path])
  if (dErr) return json({ error: dErr.message }, 500)

  const { error: uErr } = await adminClient
    .from('athlete_profile_edit_requests')
    .update({ id_document_path: null })
    .eq('id', requestId)
  if (uErr) return json({ error: uErr.message }, 500)

  return json({ data: { deleted: true } })
})

