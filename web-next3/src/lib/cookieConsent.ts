import { getSupabaseBrowserClient } from './supabaseClient'

export const LEGAL_VERSION = '2026-05-01'

const CONSENT_KEY = 'walar-cookie-consent'
const ANON_ID_KEY = 'walar-anon-id'

export type CookieConsent = {
  version: string
  acceptedAt: string // ISO
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore (private mode / blocked storage)
  }
}

export function getOrCreateAnonymousId(): string {
  const existing = safeGetItem(ANON_ID_KEY)
  if (existing?.trim()) return existing
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `anon_${Math.random().toString(16).slice(2)}_${Date.now()}`
  safeSetItem(ANON_ID_KEY, id)
  return id
}

export function getCookieConsent(): CookieConsent | null {
  const raw = safeGetItem(CONSENT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>
    if (!parsed?.acceptedAt || !parsed?.version) return null
    return { acceptedAt: String(parsed.acceptedAt), version: String(parsed.version) }
  } catch {
    return null
  }
}

export function setCookieConsentAccepted(): CookieConsent {
  const consent: CookieConsent = { version: LEGAL_VERSION, acceptedAt: new Date().toISOString() }
  safeSetItem(CONSENT_KEY, JSON.stringify(consent))
  return consent
}

export async function logCookieConsentBestEffort(): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) return

  const consent = getCookieConsent()
  if (!consent) return

  const {
    data: { user },
  } = await sb.auth.getUser()

  const payload = {
    user_id: user?.id ?? null,
    anonymous_id: getOrCreateAnonymousId(),
    consent_version: consent.version,
  }

  const { error } = await sb.from('cookie_consents').insert(payload)
  if (error) {
    // Keep banner UX independent of DB availability/migrations.
    return
  }
}

