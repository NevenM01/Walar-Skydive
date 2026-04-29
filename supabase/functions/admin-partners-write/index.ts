import { requireAdmin, json, handleCors } from '../_shared/adminClient.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const auth = await requireAdmin(req)
  if (auth.error) return json({ error: auth.error }, auth.status)
  const { adminClient } = auth

  const body = await req.json()
  const { action, payload } = body

  if (action === 'insert') {
    const { name, url, kind, tagline, sort_order } = payload

    const { data, error } = await adminClient
      .from('walar_project_partners')
      .insert({
        name,
        url: url ?? null,
        kind,
        tagline: tagline?.trim() || null,
        sort_order: sort_order ?? 0,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'update') {
    const { id, name, url, kind, tagline, sort_order } = payload

    const { data, error } = await adminClient
      .from('walar_project_partners')
      .update({
        name,
        url: url ?? null,
        kind,
        tagline: tagline?.trim() || null,
        sort_order: sort_order ?? 0,
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
      .from('walar_project_partners')
      .delete()
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)
    return json({ success: true })
  }

  return json({ error: `Unknown action: ${action}` }, 400)
})
