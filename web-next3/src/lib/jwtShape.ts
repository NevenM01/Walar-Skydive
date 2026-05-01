/** True if the string has the structural shape of a JWT (three non-empty segments). */
export function isJwtShaped(accessToken: string | null | undefined): boolean {
  if (accessToken == null) return false
  const t = accessToken.trim()
  if (!t) return false
  const parts = t.split('.')
  return parts.length === 3 && parts.every((p) => p.length > 0)
}
