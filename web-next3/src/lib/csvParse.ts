/** Detect comma or semicolon from first non-empty line. */
export function detectDelimiter(headerLine: string): ',' | ';' {
  const semi = (headerLine.match(/;/g) ?? []).length
  const comma = (headerLine.match(/,/g) ?? []).length
  return semi > comma ? ';' : ','
}

/**
 * Minimal RFC-style CSV parser (quoted fields, doubled quotes).
 * Delimiter is comma or semicolon (single char).
 */
export function parseCsvRows(text: string, delimiter: ',' | ';'): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  const len = text.length

  const pushField = () => {
    row.push(field)
    field = ''
  }

  for (let i = 0; i < len; i++) {
    const c = text[i]!

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
          continue
        }
        inQuotes = false
        continue
      }
      field += c
      continue
    }

    if (c === '"') {
      inQuotes = true
      continue
    }

    if (c === delimiter) {
      pushField()
      continue
    }

    if (c === '\r') continue

    if (c === '\n') {
      pushField()
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      continue
    }

    field += c
  }

  pushField()
  if (row.some((cell) => cell.length > 0)) rows.push(row)

  return rows
}

export function parseCsv(text: string): { delimiter: ',' | ';'; rows: string[][] } {
  const firstNl = text.indexOf('\n')
  const firstLine = (firstNl === -1 ? text : text.slice(0, firstNl)).trim()
  const delimiter = detectDelimiter(firstLine)
  return { delimiter, rows: parseCsvRows(text.replace(/^\uFEFF/, ''), delimiter) }
}
