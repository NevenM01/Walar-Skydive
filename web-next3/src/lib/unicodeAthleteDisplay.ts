/**
 * Fixes broken display when the DB/import contained U+FFFD or composed characters.
 * Does not recover lost bytes — re-import with correct CSV encoding is still the real fix.
 */
export function normalizeUnicodeForDisplay(s: string): string {
  return s
    .replace(/\uFFFD/g, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
}

const UPPER_LOCALE = 'hr-HR'

function firstLetter(word: string): string {
  for (const ch of word) {
    if (/\p{L}/u.test(ch)) return ch.toLocaleUpperCase(UPPER_LOCALE)
  }
  return ''
}

/** Initials from an already-cleaned display name (or raw — normalizes first). */
export function athleteDisplayInitials(name: string): string {
  const n = normalizeUnicodeForDisplay(name)
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = firstLetter(parts[0]!)
    const b = firstLetter(parts[parts.length - 1]!)
    if (a && b) return a + b
  }
  let out = ''
  for (const ch of n) {
    if (/\p{L}/u.test(ch)) {
      out += ch.toLocaleUpperCase(UPPER_LOCALE)
      if (out.length >= 2) break
    }
  }
  return out.length > 0 ? out : '?'
}
