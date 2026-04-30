import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../lib/supabaseClient'
import { AuthContext, type AppProfile } from './auth-context'

async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const sb = getSupabaseBrowserClient()
  if (!sb) return null
  const { data, error } = await sb.from('profiles').select('is_admin, role').eq('id', userId).maybeSingle()
  if (error) {
    console.error('fetchProfile', error.message)
    return null
  }
  if (!data) return null
  return {
    is_admin: Boolean(data.is_admin),
    role: String(data.role ?? 'athlete'),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      return
    }
    const p = await fetchProfile(user.id)
    setProfile(p)
  }, [user])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      void (async () => {
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
      })()
      return
    }

    const sb = getSupabaseBrowserClient()!
    let cancelled = false

    async function init() {
      const {
        data: { session: s },
      } = await sb.auth.getSession()
      if (cancelled) return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user?.id) {
        const p = await fetchProfile(s.user.id)
        if (!cancelled) setProfile(p)
      } else {
        setProfile(null)
      }
      if (!cancelled) setLoading(false)
    }

    void init()

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setProfile(null)
      setLoading(true)
      void (async () => {
        if (newSession?.user?.id) {
          const p = await fetchProfile(newSession.user.id)
          if (!cancelled) setProfile(p)
        } else {
          setProfile(null)
        }
        if (!cancelled) setLoading(false)
      })()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const sb = getSupabaseBrowserClient()
    if (!sb) {
      return { error: new Error('Supabase is not configured.') }
    }
    const { error } = await sb.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const sb = getSupabaseBrowserClient()
    if (!sb) {
      return { error: new Error('Supabase is not configured.') }
    }
    const redirectTo = `${window.location.origin}/login`
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signOut = useCallback(async () => {
    const sb = getSupabaseBrowserClient()
    if (sb) await sb.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signInWithPassword,
      resetPasswordForEmail,
      signOut,
      refreshProfile,
    }),
    [session, user, profile, loading, signInWithPassword, resetPasswordForEmail, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
