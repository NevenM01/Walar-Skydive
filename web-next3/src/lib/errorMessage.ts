/** Normalize thrown values for UI (PostgREST errors, strings, etc.). */
export function errorMessageFromUnknown(e: unknown, fallback = 'Something went wrong.'): string {
  if (typeof e === 'string' && e.trim()) return e
  if (e instanceof Error && e.message.trim()) return e.message
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m
  }
  return fallback
}
