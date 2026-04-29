import { getSupabaseBrowserClient } from './supabaseClient'

const MAX_BYTES = 3 * 1024 * 1024

/**
 * Upload a profile image via edge function (server-side validation + storage).
 * Returns the storage path of the uploaded avatar.
 */
export async function uploadAthleteAvatarToStorage(file: File, _userId: string): Promise<string> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPEG, PNG, WebP, or GIF).')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image too large (max 3 MB).')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'athlete-avatars')

  const { data: result, error } = await sb.functions.invoke('upload-file', {
    body: formData,
  })

  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)

  return result.path as string
}

/**
 * No-op: old avatars are now cleaned up server-side by the upload-file edge function.
 */
export async function clearAthleteAvatarStorageForUser(_userId: string): Promise<void> {
  // Handled server-side in upload-file edge function
}
