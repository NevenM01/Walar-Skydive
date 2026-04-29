import { parseCsv } from './csvParse'

/** Prefer UTF-8 on ties, then Central European Excel exports. */
const CSV_DECODER_TIE_ORDER = ['utf-8', 'windows-1250', 'iso-8859-2', 'windows-1252'] as const

function tieBreakDecoder(a: string, b: string): number {
  const ia = CSV_DECODER_TIE_ORDER.indexOf(a as (typeof CSV_DECODER_TIE_ORDER)[number])
  const ib = CSV_DECODER_TIE_ORDER.indexOf(b as (typeof CSV_DECODER_TIE_ORDER)[number])
  const sa = ia === -1 ? 99 : ia
  const sb = ib === -1 ? 99 : ib
  return sa - sb
}

/**
 * Pick the most plausible decoding for regional Latin names.
 * UTF-8 without U+FFFD was used before, but Windows-1250 CSV can decode as “valid” mojibake UTF-8 with no FFFD.
 */
function scoreDecodedCsvText(s: string): number {
  const ffdCount = (s.match(/\uFFFD/g) ?? []).length
  let score = -ffdCount * 120
  for (let i = 0; i < s.length; i++) {
    const c = s.codePointAt(i)!
    if (c > 0xffff) i++
    if (c >= 0x0100 && c <= 0x024f) score += 4
    if ((c >= 0x0400 && c <= 0x04ff) || (c >= 0x0500 && c <= 0x052f)) score += 2
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) score += 0.01
  }
  if (/[ÃÂÄÅÆÈÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß¿]/.test(s)) score -= 25
  return score
}

/** Convert parsed spreadsheet cells to strings for WALAR CSV import. */
export function cellsToStringRows(rows: Array<Array<unknown>>): string[][] {
  return rows.map((r) =>
    r.map((c) => {
      if (c === null || c === undefined) return ''
      if (typeof c === 'boolean') return c ? 'true' : 'false'
      if (c instanceof Date) {
        if (Number.isNaN(c.getTime())) return ''
        const y = c.getFullYear()
        const mo = String(c.getMonth() + 1).padStart(2, '0')
        const d = String(c.getDate()).padStart(2, '0')
        return `${y}-${mo}-${d}`
      }
      return String(c).trim()
    }),
  )
}

/**
 * Read a CSV or Excel file into row matrix (first sheet only for .xlsx).
 */
export async function parseResultsSpreadsheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) {
    const { default: readXlsxFile } = await import('read-excel-file/browser')
    const raw = await readXlsxFile(file)
    return cellsToStringRows(raw as Array<Array<unknown>>)
  }

  // CSV encoding note:
  // Excel on Windows often exports CSV as Windows-1250/1252, not UTF-8.
  // `file.text()` assumes UTF-8 and will produce U+FFFD (�) for diacritics.
  const buf = await file.arrayBuffer()

  const decoders: Array<{ label: string; decoder: TextDecoder }> = [
    // Try UTF-8 first (with BOM support).
    { label: 'utf-8', decoder: new TextDecoder('utf-8') },
    // Common Excel exports for Central Europe.
    { label: 'windows-1250', decoder: new TextDecoder('windows-1250') },
    { label: 'iso-8859-2', decoder: new TextDecoder('iso-8859-2') },
    // Fallback for western CSV exports.
    { label: 'windows-1252', decoder: new TextDecoder('windows-1252') },
  ]

  let bestText = ''
  let bestScore = Number.NEGATIVE_INFINITY
  let bestLabel = ''
  for (const { label, decoder } of decoders) {
    const candidate = decoder.decode(buf)
    const sc = scoreDecodedCsvText(candidate)
    if (sc > bestScore) {
      bestScore = sc
      bestText = candidate
      bestLabel = label
    } else if (sc === bestScore && bestLabel) {
      if (tieBreakDecoder(label, bestLabel) < 0) {
        bestText = candidate
        bestLabel = label
      }
    }
  }

  const { rows } = parseCsv(bestText.replace(/^\uFEFF/, ''))
  return rows
}
