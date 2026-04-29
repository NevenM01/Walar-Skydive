import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AppProfile = {
  is_admin: boolean
  role: string
}

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: AppProfile | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
