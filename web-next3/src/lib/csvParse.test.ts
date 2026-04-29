import { describe, expect, it } from 'vitest'
import { detectDelimiter, parseCsv, parseCsvRows } from './csvParse'

describe('parseCsv', () => {
  it('parses comma and quoted fields', () => {
    const { delimiter, rows } = parseCsv('a,b\n"1,2",3')
    expect(delimiter).toBe(',')
    expect(rows).toEqual([
      ['a', 'b'],
      ['1,2', '3'],
    ])
  })

  it('detects semicolon', () => {
    expect(detectDelimiter('a;b;c')).toBe(';')
    const rows = parseCsvRows('x;y\n1;2', ';')
    expect(rows).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ])
  })
})
