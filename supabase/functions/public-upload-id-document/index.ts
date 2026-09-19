import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, handleCors } from '../_shared/adminClient.ts'

const BUCKET = 'athlete-id-documents'
const MAX_BYTES = 5 * 1024 * 1024

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Anonymous upload allowed for this specific workflow.
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return json({ error: 'No file provided' }, 400)

  if (!file.type.startsWith('image/')) return json({ error: 'Only image files are allowed' }, 400)

  const bytes = await file.arrayBuffer()
  if (bytes.byteLength > MAX_BYTES) return json({ error: 'File too large. Max 5MB' }, 400)

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : (file.type.split('/')[1] ?? 'jpg')
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg'
  const storagePath = `${crypto.randomUUID()}.${safeExt}`

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (error) {
    console.error('public-upload-id-document', error.message)
    return json({ error: 'Internal error' }, 500)
  }
  return json({ data: { path: data.path } })
})

