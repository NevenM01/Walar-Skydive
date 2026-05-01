/**
 * Only forward Authorization to PostgREST when the bearer token looks like a JWT
 * (three non-empty dot-separated segments). Corrupted browser sessions often produce
 * malformed values and trigger UNAUTHORIZED_INVALID_JWT_FORMAT; omitting the header
 * falls back to the anon key configured on the Supabase client.
 */
export function forwardableAuthorizationHeader(raw: string | null): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const m = trimmed.match(/^Bearer\s+(.+)$/i)
  const token = (m?.[1] ?? trimmed).trim()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) return null
  return `Bearer ${token}`
}
