import { getSupabaseBrowserClient } from './supabaseClient'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Upload news images via edge function (server-side validation + storage).
 * Returns array of public URLs.
 */
export async function uploadNewsImagesToStorage(files: File[], _userId: string): Promise<string[]> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const urls: string[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      throw new Error(`Not an image file: ${file.name}`)
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`Image too large (max 5 MB): ${file.name}`)
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'news-images')

    const { data: result, error } = await sb.functions.invoke('upload-file', {
      body: formData,
    })

    if (error) throw new Error(error.message)
    if (result?.error) throw new Error(result.error)

    urls.push(result.publicUrl as string)
  }
  return urls
}
