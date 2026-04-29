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
    const {
      title, excerpt, body: postBody, category,
      published_at, is_published, author_name, image_urls, is_home_priority
    } = payload

    // Atomski: ako je home priority, resetiraj ostale u istoj operaciji
    if (is_home_priority) {
      const { error: clearError } = await adminClient
        .from('walar_news_posts')
        .update({ is_home_priority: false, updated_at: new Date().toISOString() })
        .eq('is_home_priority', true)
      if (clearError) return json({ error: clearError.message }, 500)
    }

    const { data, error } = await adminClient
      .from('walar_news_posts')
      .insert({
        title,
        excerpt: excerpt ?? null,
        body: postBody ?? null,
        category: category ?? null,
        published_at: published_at ?? null,
        is_published: is_published ?? false,
        author_name: author_name ?? null,
        image_urls: image_urls ?? [],
        is_home_priority: is_home_priority ?? false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (action === 'update') {
    const {
      id, title, excerpt, body: postBody, category,
      published_at, is_published, author_name, image_urls, is_home_priority
    } = payload

    // Atomski: ako je home priority, resetiraj ostale (osim ovog posta)
    if (is_home_priority) {
      const { error: clearError } = await adminClient
        .from('walar_news_posts')
        .update({ is_home_priority: false, updated_at: new Date().toISOString() })
        .eq('is_home_priority', true)
        .neq('id', id)
      if (clearError) return json({ error: clearError.message }, 500)
    }

    const { data, error } = await adminClient
      .from('walar_news_posts')
      .update({
        title,
        excerpt: excerpt ?? null,
        body: postBody ?? null,
        category: category ?? null,
        published_at: published_at ?? null,
        is_published: is_published ?? false,
        author_name: author_name ?? null,
        image_urls: image_urls ?? [],
        is_home_priority: is_home_priority ?? false,
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
      .from('walar_news_posts')
      .delete()
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)
    return json({ success: true })
  }

  return json({ error: `Unknown action: ${action}` }, 400)
})
