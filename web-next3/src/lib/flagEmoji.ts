/** Two-letter ISO country code → regional indicator emoji (rendering depends on font/OS). */
export function flagEmoji(code: string): string {
  const cc = code.trim().toUpperCase()
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return '🏳️'
  const A = 0x1f1e6
  const a = 'A'.charCodeAt(0)
  return String.fromCodePoint(A + (cc.charCodeAt(0) - a), A + (cc.charCodeAt(1) - a))
}
