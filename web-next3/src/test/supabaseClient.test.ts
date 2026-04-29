import { describe, it, expect, vi, afterEach } from 'vitest'
import { isSupabaseConfigured } from '../lib/supabaseClient'

describe('isSupabaseConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when URL is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns false when key is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns true when both are set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    expect(isSupabaseConfigured()).toBe(true)
  })
})
