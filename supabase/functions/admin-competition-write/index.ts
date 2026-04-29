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
    const { name, start_date, end_date, location, category, status, fai_class, description, unique_label } = payload

    const { data, error } = await adminClient
      .from('competitions')
      .insert({
        name: name?.trim(),
        start_date,
        end_date,
        location: location?.trim() ?? null,
        category: category?.trim() ?? 'Open',
        status: status ?? 'upcoming',
        fai_class: fai_class?.trim() ?? null,
        description: description?.trim() ?? null,
        unique_label: unique_label?.trim() ?? null
      })
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'update') {
    const { id, name, start_date, end_date, location, category, status, fai_class, description, unique_label } = payload

    const { data, error } = await adminClient
      .from('competitions')
      .update({
        name: name?.trim(),
        start_date,
        end_date,
        location: location?.trim() ?? null,
        category: category?.trim() ?? 'Open',
        status: status ?? 'upcoming',
        fai_class: fai_class?.trim() ?? null,
        description: description?.trim() ?? null,
        unique_label: unique_label?.trim() ?? null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'update-label') {
    const { id, unique_label } = payload

    const { data, error } = await adminClient
      .from('competitions')
      .update({
        unique_label: unique_label?.trim() || null,
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
      .from('competitions')
      .delete()
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)
    return json({ success: true })
  }

  return json({ error: `Unknown action: ${action}` }, 400)
})
