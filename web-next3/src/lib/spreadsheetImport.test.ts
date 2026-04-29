import { describe, expect, it } from 'vitest'
import { cellsToStringRows } from './spreadsheetImport'

describe('cellsToStringRows', () => {
  it('stringifies booleans and nulls', () => {
    expect(
      cellsToStringRows([
        ['a', true, false, null, undefined, 3],
        [],
      ]),
    ).toEqual([['a', 'true', 'false', '', '', '3'], []])
  })
})
