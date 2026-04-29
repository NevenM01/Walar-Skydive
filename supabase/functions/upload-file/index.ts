import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleCors } from '../_shared/adminClient.ts'

const MAX_AVATAR_BYTES = 3 * 1024 * 1024
const MAX_NEWS_BYTES = 5 * 1024 * 1024

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const formData = await req.formData()
  // bucket dolazi ili iz form data polja ili iz query params
  const url = new URL(req.url)
  const bucket = (formData.get('bucket') as string | null) || url.searchParams.get('bucket') || ''

  if (bucket === 'news-images') {
    const { data: profile } = await userClient.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return json({ error: 'Forbidden' }, 403)
  }

  const file = formData.get('file') as File | null
  if (!file) return json({ error: 'No file provided' }, 400)

  if (!file.type.startsWith('image/')) return json({ error: 'Only image files are allowed' }, 400)

  const maxBytes = bucket === 'news-images' ? MAX_NEWS_BYTES : MAX_AVATAR_BYTES
  const fileBytes = await file.arrayBuffer()
  if (fileBytes.byteLength > maxBytes) {
    return json({ error: `File too large. Max ${maxBytes / 1024 / 1024}MB` }, 400)
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : (file.type.split('/')[1] ?? 'jpg')

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let storagePath: string

  if (bucket === 'athlete-avatars') {
    const { data: existing } = await adminClient.storage.from('athlete-avatars').list(user.id)
    if (existing && existing.length > 0) {
      const paths = existing.map(f => `${user.id}/${f.name}`)
      await adminClient.storage.from('athlete-avatars').remove(paths)
    }
    storagePath = `${user.id}/avatar.${ext}`
  } else if (bucket === 'news-images') {
    storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`
  } else {
    return json({ error: `Unknown bucket: ${bucket}` }, 400)
  }

  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(bucket)
    .upload(storagePath, fileBytes, { contentType: file.type, upsert: bucket === 'athlete-avatars' })

  if (uploadError) return json({ error: uploadError.message }, 500)

  const { data: { publicUrl } } = adminClient.storage.from(bucket).getPublicUrl(storagePath)

  // Avatars are served via signed URLs (bucket may be private).
  if (bucket === 'athlete-avatars') {
    return json({ path: uploadData.path })
  }

  return json({ path: uploadData.path, publicUrl })
})
