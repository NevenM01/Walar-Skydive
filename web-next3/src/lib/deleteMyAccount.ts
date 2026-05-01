import { getSupabaseBrowserClient } from './supabaseClient'

export async function deleteMyAccount(): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: res, error } = await sb.functions.invoke('delete-my-account', { body: {} })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(res.error)
}

