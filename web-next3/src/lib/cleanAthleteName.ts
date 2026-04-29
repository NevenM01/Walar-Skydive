import { normalizeUnicodeForDisplay } from './unicodeAthleteDisplay'

/**
 * Normalizes messy competition import names for public display.
 * Drops trailing squad codes (e.g. QATAR1, UAE2) and blocks of ALL CAPS tags (clubs/federations).
 */
export function cleanAthleteName(raw: string): string {
  const normalized = normalizeUnicodeForDisplay(raw)
  if (!normalized) return ''
  const parts = normalized.split(' ')

  function tokenCore(token: string): string {
    return token.replace(/[^\p{L}\d]/gu, '')
  }

  /** e.g. QATAR1, UAE2, TEAM3 — not a human surname */
  function isLetterDigitSuffixToken(token: string): boolean {
    const c = tokenCore(token)
    return /^[A-Za-z]{2,}\d+$/.test(c)
  }

  function isAllCapsTagToken(token: string): boolean {
    const core = tokenCore(token)
    if (!core) return false
    const upper = core.toUpperCase()
    const lower = core.toLowerCase()
    const hasLetters = upper !== lower
    return (hasLetters && core === upper && core.length >= 2) || (!hasLetters && /^\d+$/.test(core))
  }

  while (parts.length > 1 && isLetterDigitSuffixToken(parts[parts.length - 1] ?? '')) {
    parts.pop()
  }

  while (parts.length > 2 && isAllCapsTagToken(parts[parts.length - 1] ?? '')) {
    parts.pop()
  }

  return parts.join(' ')
}
