import { describe, expect, it } from 'vitest'
import {
  buildHeaderIndex,
  normalizeCountryToIso2,
  resolveAthleteDisplayName,
  validateResultsHeaders,
} from './csvImportResults'
import { parseCsv } from './csvParse'

const SPLIT_HEADER =
  'Competition label;First name;Last name;Country code;Gender;GDPR consent;Publish full name;National team member;Date of birth;WPC medalist;Jump 1;Jump 2;Jump 3;Jump 4;Jump 5;Jump 6;Jump 7;Jump 8;SF cm;F cm;Start number;Team'

describe('csvImportResults headers', () => {
  it('accepts First name + Last name template headers', () => {
    const { rows } = parseCsv(SPLIT_HEADER)
    const idx = buildHeaderIndex(rows[0]!)
    expect(validateResultsHeaders(idx)).toBeNull()
    expect(idx.get('competition_unique_label')).toBe(0)
    expect(idx.get('first_name')).toBe(1)
    expect(idx.get('last_name')).toBe(2)
    expect(idx.get('date_of_birth')).toBe(8)
    expect(idx.get('jump1_cm')).toBe(10)
    expect(idx.get('sf_cm')).toBe(18)
    expect(idx.get('team')).toBe(21)
  })

  it('resolveAthleteDisplayName joins first + last', () => {
    const { rows } = parseCsv(`${SPLIT_HEADER}\nX;Ann;Smith;HR;M;true;;;;;`)
    const idx = buildHeaderIndex(rows[0]!)
    expect(resolveAthleteDisplayName(rows[1]!, idx)).toBe('Ann Smith')
  })

  it('still accepts Croatian-friendly single full-name column', () => {
    const text =
      'Oznaka natjecanja;Ime natjecatelja;Drzava;Spol;GDPR pristanak;Objavi puno ime;Reprezentacija;Kategorija;WPC medalja;Skok 1;Skok 2;Skok 3;Skok 4;Skok 5;Skok 6;Skok 7;Skok 8;SF cm;F cm;Startni broj;Momcad'
    const { rows } = parseCsv(text)
    const idx = buildHeaderIndex(rows[0]!)
    expect(validateResultsHeaders(idx)).toBeNull()
  })

  it('maps TB 1 … TB 6 headers to tb1_cm … tb6_cm', () => {
    const text =
      'Competition label;First name;Last name;Country code;Gender;GDPR consent;TB 1;TB 2;Place M'
    const { rows } = parseCsv(text)
    const idx = buildHeaderIndex(rows[0]!)
    expect(idx.get('tb1_cm')).toBe(6)
    expect(idx.get('tb2_cm')).toBe(7)
  })

  it('still accepts technical comma headers with athlete_display_name', () => {
    const text =
      'competition_unique_label,athlete_display_name,country_code,gender,gdpr_consent_given,gdpr_publish_full_name,member_national_team,age_category,wpc_medalist,jump1_cm,jump2_cm,jump3_cm,jump4_cm,jump5_cm,jump6_cm,jump7_cm,jump8_cm,sf_cm,f_cm,start_number,team'
    const { rows } = parseCsv(text)
    const idx = buildHeaderIndex(rows[0]!)
    expect(validateResultsHeaders(idx)).toBeNull()
  })
})

describe('normalizeCountryToIso2', () => {
  const mini = new Map<string, string>([
    ['QAT', 'QA'],
    ['QATAR', 'QA'],
    ['GERMANY', 'DE'],
    ['FRANCE', 'FR'],
  ])

  it('maps empty to XX', () => {
    expect(normalizeCountryToIso2('', mini)).toBe('XX')
    expect(normalizeCountryToIso2('   ', mini)).toBe('XX')
  })

  it('maps aliases case-insensitively via trimmed upper key', () => {
    expect(normalizeCountryToIso2('QAT', mini)).toBe('QA')
    expect(normalizeCountryToIso2('qatar', mini)).toBe('QA')
    expect(normalizeCountryToIso2('Germany', mini)).toBe('DE')
  })

  it('passes through valid ISO2', () => {
    expect(normalizeCountryToIso2('HR', mini)).toBe('HR')
    expect(normalizeCountryToIso2('qa', mini)).toBe('QA')
  })

  it('returns null for unknown', () => {
    expect(normalizeCountryToIso2('Narnia', mini)).toBeNull()
  })
})
