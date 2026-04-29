import { getSupabaseBrowserClient } from './supabaseClient'

export async function fetchAvatarSignedUrl(params: {
  athleteId: string
  kind: 'pending' | 'approved'
}): Promise<string | null> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: res, error } = await sb.functions.invoke('avatar-signed-url', {
    body: { athleteId: params.athleteId, kind: params.kind },
  })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(res.error)

  return (res?.data?.signedUrl as string | null) ?? null
}

