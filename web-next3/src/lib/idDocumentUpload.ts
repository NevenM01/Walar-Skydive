import { getSupabaseBrowserClient } from './supabaseClient'

const MAX_BYTES = 5 * 1024 * 1024

export async function uploadIdDocumentToStorage(file: File): Promise<string> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPEG, PNG, WebP, or GIF).')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image too large (max 5 MB).')
  }

  const formData = new FormData()
  formData.append('file', file)

  const { data: result, error } = await sb.functions.invoke('public-upload-id-document', {
    body: formData,
  })

  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  const path = result?.data?.path as string | undefined
  if (!path) throw new Error('Upload failed.')
  return path
}

