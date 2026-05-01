import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null
let anonPublicClient: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(url?.trim() && key?.trim())
}

/** Browser client; null if env vars are missing. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  const url = import.meta.env.VITE_SUPABASE_URL!.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim()
  if (!browserClient) {
    browserClient = createClient(url, key)
  }
  return browserClient
}

/**
 * Client scoped to the anon key only — does not read persisted auth sessions.
 * Use for public catalog data (rankings, events, published news, partners) so
 * anonymous visitors always get the same access as `anon` in RLS, even if
 * local session storage holds a corrupted token.
 */
export function getSupabaseAnonPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  const url = import.meta.env.VITE_SUPABASE_URL!.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim()
  if (!anonPublicClient) {
    anonPublicClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  return anonPublicClient
}
