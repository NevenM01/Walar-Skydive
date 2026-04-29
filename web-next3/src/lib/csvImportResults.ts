import type { SupabaseClient } from '@supabase/supabase-js'

/** Required except name: use athlete_display_name *or* both first_name + last_name. */
export const RESULTS_IMPORT_REQUIRED_HEADERS = ['country_code', 'gender', 'gdpr_consent_given'] as const

export type ResultsImportRowError = { rowNumber: number; message: string }
type ResultsGender = 'M' | 'F'
type PlaceField =
  | 'place_overall'
  | 'place_m'
  | 'place_f'
  | 'place_j'
  | 'place_mj'
  | 'place_fj'
  | 'place_master'

type ResultsImportPayload = {
  competition_id: string
  athlete_id: string
  start_number: string | null
  team: string | null
  jump1_cm: number | null
  jump2_cm: number | null
  jump3_cm: number | null
  jump4_cm: number | null
  jump5_cm: number | null
  jump6_cm: number | null
  jump7_cm: number | null
  jump8_cm: number | null
  sf_cm: number | null
  f_cm: number | null
  /** Tie-break rounds (cm). Stored only; not used in walar_jump_totals / AX. */
  tb1_cm: number | null
  tb2_cm: number | null
  tb3_cm: number | null
  tb4_cm: number | null
  tb5_cm: number | null
  tb6_cm: number | null
  member_national_team: boolean
  age_category: string | null
  wpc_medalist: boolean
  place_overall: number | null
  place_m: number | null
  place_f: number | null
  place_j: number | null
  place_mj: number | null
  place_fj: number | null
  place_master: number | null
}

type PendingResultRow = {
  rowNumber: number
  competitionId: string
  gender: ResultsGender
  ageCategory: string | null
  totalCm: number | null
  payload: ResultsImportPayload
}

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]/gu, '')
}

/**
 * Maps normalized header labels (friendly English/Croatian or technical snake_case) to canonical import keys.
 */
export const RESULTS_HEADER_SYNONYMS: Record<string, string> = {
  // Competition identity
  oznaka_natjecanja: 'competition_unique_label',
  natjecanje: 'competition_unique_label',
  competition_label: 'competition_unique_label',
  id_natjecanja: 'competition_id',
  competition_uuid: 'competition_id',
  // Excel native: "Uniqe Competition" (intentional typo in Excel)
  uniqe_competition: 'competition_unique_label', unique_competition: 'competition_unique_label',

  // Competition display name
  naziv_natjecanja: 'competition_display_name',
  ime_dogadaja: 'competition_display_name',
  event_name: 'competition_display_name',
  // Excel native: "Competition" column
  competition: 'competition_display_name',

  // Competition location
  lokacija_natjecanja: 'competition_location',
  mjesto_natjecanja: 'competition_location',
  // Excel native: "Place" column (competition city)
  place: 'competition_location',

  // Competition dates
  datum_pocetka_natjecanja: 'competition_start_date',
  datum_pocetka: 'competition_start_date',
  datum_kraja_natjecanja: 'competition_end_date',
  datum_kraja: 'competition_end_date',
  // Excel native: "Date of Competition"
  date_of_competition: 'competition_start_date',

  // Competition rounds
  finished_jump_rounds: 'competition_finished_jump_rounds',
  finished_rounds: 'competition_finished_jump_rounds',
  zavrsene_runde: 'competition_finished_jump_rounds',
  broj_rundi: 'competition_finished_jump_rounds',
  zavrsen_krug: 'competition_finished_jump_rounds',
  runde: 'competition_finished_jump_rounds',
  competition_finished_jump_rounds: 'competition_finished_jump_rounds',
  // Excel native: "Jump Rounds"
  jump_rounds: 'competition_finished_jump_rounds',

  // Competition rang
  competition_rang: 'competition_rang_code',
  rang_natjecanja: 'competition_rang_code',
  competition_rank: 'competition_rang_code',
  walar_rang: 'competition_rang_code',

  // Athlete (single full name — legacy / one column)
  ime_natjecatelja: 'athlete_display_name',
  athlete_name: 'athlete_display_name',
  prezime_i_ime: 'athlete_display_name',
  full_name: 'athlete_display_name',
  // Excel native: "Competitor"
  competitor: 'athlete_display_name',

  // Split name (template default)
  ime: 'first_name',
  first: 'first_name',
  given_name: 'first_name',
  forename: 'first_name',
  prezime: 'last_name',
  surname: 'last_name',
  family_name: 'last_name',

  // Country
  drzava: 'country_code',
  država: 'country_code',
  country: 'country_code',
  // Excel native: "Nation"
  nation: 'country_code',

  // Gender
  spol: 'gender',
  sex: 'gender',

  // GDPR / flags
  gdpr_pristanak: 'gdpr_consent_given',
  gdpr_consent: 'gdpr_consent_given',
  pristanak_gdpr: 'gdpr_consent_given',
  // Excel native: "GDPR"
  gdpr: 'gdpr_consent_given',
  objavi_puno_ime: 'gdpr_publish_full_name',
  publish_full_name: 'gdpr_publish_full_name',
  reprezentacija: 'member_national_team',
  repka: 'member_national_team',
  clan_reprezentacije: 'member_national_team',
  national_team: 'member_national_team',
  national_team_member: 'member_national_team',
  member_of_national_team: 'member_national_team',
  member_nt: 'member_national_team',
  // Excel native: "Member of National Team"
  member_of_national_team_excel: 'member_national_team',
  kategorija: 'age_category',
  dobna_kategorija: 'age_category',

  // Date of birth
  date_of_birth: 'date_of_birth',
  birth_date: 'date_of_birth',
  birthdate: 'date_of_birth',
  datum_rodenja: 'date_of_birth',
  datum_rođenja: 'date_of_birth',
  // Excel native: "DoB"
  dob: 'date_of_birth',

  // WPC medalist
  wpc_medalja: 'wpc_medalist',
  wpc: 'wpc_medalist',

  // FAI licence
  fai_licence: 'fai_licence',
  fai_license: 'fai_licence',
  fai_id: 'fai_licence',
  fai_licenca: 'fai_licence',
  fai_broj: 'fai_licence',
  // Excel native: "FAI ID Licence"
  fai_id_licence: 'fai_licence',

  // Jumps (Croatian + generic)
  skok_1: 'jump1_cm',
  skok_2: 'jump2_cm',
  skok_3: 'jump3_cm',
  skok_4: 'jump4_cm',
  skok_5: 'jump5_cm',
  skok_6: 'jump6_cm',
  skok_7: 'jump7_cm',
  skok_8: 'jump8_cm',
  jump_1: 'jump1_cm',
  jump_2: 'jump2_cm',
  jump_3: 'jump3_cm',
  jump_4: 'jump4_cm',
  jump_5: 'jump5_cm',
  jump_6: 'jump6_cm',
  jump_7: 'jump7_cm',
  jump_8: 'jump8_cm',
  // Excel native: "1. ", "2.", "3. " etc. → after normHeader become "1", "2", "3"
  '1': 'jump1_cm', '2': 'jump2_cm', '3': 'jump3_cm', '4': 'jump4_cm',
  '5': 'jump5_cm', '6': 'jump6_cm', '7': 'jump7_cm', '8': 'jump8_cm',
  // Excel native: "SF" and "F" columns (semi-final and final round)
  sf: 'sf_cm', f: 'f_cm',

  // Tie-break (optional; archival — does not affect AX / main total)
  tb_1: 'tb1_cm',
  tb1: 'tb1_cm',
  tb1_cm: 'tb1_cm',
  tb_round_1: 'tb1_cm',
  tie_break_1: 'tb1_cm',
  dodatni_skok_1: 'tb1_cm',
  tb_2: 'tb2_cm',
  tb2: 'tb2_cm',
  tb2_cm: 'tb2_cm',
  tb_round_2: 'tb2_cm',
  tie_break_2: 'tb2_cm',
  dodatni_skok_2: 'tb2_cm',
  tb_3: 'tb3_cm',
  tb3: 'tb3_cm',
  tb3_cm: 'tb3_cm',
  tb_round_3: 'tb3_cm',
  tie_break_3: 'tb3_cm',
  dodatni_skok_3: 'tb3_cm',
  tb_4: 'tb4_cm',
  tb4: 'tb4_cm',
  tb4_cm: 'tb4_cm',
  tb_round_4: 'tb4_cm',
  tie_break_4: 'tb4_cm',
  dodatni_skok_4: 'tb4_cm',
  tb_5: 'tb5_cm',
  tb5: 'tb5_cm',
  tb5_cm: 'tb5_cm',
  tb_round_5: 'tb5_cm',
  tie_break_5: 'tb5_cm',
  dodatni_skok_5: 'tb5_cm',
  tb_6: 'tb6_cm',
  tb6: 'tb6_cm',
  tb6_cm: 'tb6_cm',
  tb_round_6: 'tb6_cm',
  tie_break_6: 'tb6_cm',
  dodatni_skok_6: 'tb6_cm',
  // Excel native: single "TB" column → tb1_cm
  tb: 'tb1_cm',

  // Start number & team
  startni_broj: 'start_number',
  start: 'start_number',
  momcad: 'team',
  momčad: 'team',
  klub: 'team',

  // Place columns
  place_mf: 'place_overall',
  place_m_f: 'place_overall',
  plasman_mf: 'place_overall',
  plasman_apsolutni: 'place_overall',
  mjesto_mf: 'place_overall',
  // Excel native: "Place M+F" → after normHeader: "place_mf" (+ removed) ✓ already above

  place_m: 'place_m',
  plasman_m: 'place_m',
  mjesto_m: 'place_m',

  place_f: 'place_f',
  plasman_z: 'place_f',
  mjesto_z: 'place_f',

  place_j: 'place_j',
  plasman_j: 'place_j',
  mjesto_juniors: 'place_j',

  place_mj: 'place_mj',
  mjesto_junior_m: 'place_mj',

  place_fj: 'place_fj',
  mjesto_junior_z: 'place_fj',

  place_master: 'place_master',
  plasman_master: 'place_master',
}

function canonicalHeaderKey(normalized: string): string {
  return RESULTS_HEADER_SYNONYMS[normalized] ?? normalized
}

export function buildHeaderIndex(headerRow: string[]): Map<string, number> {
  const m = new Map<string, number>()
  headerRow.forEach((cell, i) => {
    const raw = normHeader(cell)
    if (!raw) return
    const k = canonicalHeaderKey(raw)
    m.set(k, i)
  })
  return m
}

export function validateResultsHeaders(idx: Map<string, number>): string | null {
  for (const h of RESULTS_IMPORT_REQUIRED_HEADERS) {
    if (!idx.has(h)) return `Missing required column: ${h}`
  }
  if (!idx.has('competition_unique_label') && !idx.has('competition_id')) {
    return 'Missing competition_unique_label or competition_id'
  }
  const hasFullName = idx.has('athlete_display_name')
  const hasSplitName = idx.has('first_name') && idx.has('last_name')
  if (!hasFullName && !hasSplitName) {
    return 'Missing athlete name: use Athlete name / athlete_display_name, or both First name and Last name.'
  }
  return null
}

/** Loads public.country_aliases for CSV import (call once per import). */
export async function fetchCountryAliasMap(
  client: SupabaseClient,
): Promise<{ map: Map<string, string>; error: string | null }> {
  const { data, error } = await client.from('country_aliases').select('alias, iso2')
  if (error) return { map: new Map(), error: `country_aliases: ${error.message}` }
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const rec = row as { alias: string; iso2: string }
    const alias = String(rec.alias ?? '').trim().toUpperCase()
    const iso2 = String(rec.iso2 ?? '').trim().toUpperCase()
    if (alias && iso2.length === 2) map.set(alias, iso2)
  }
  return { map, error: null }
}

/**
 * Same rules as public.normalize_country_to_iso2: empty -> XX; alias hit; else valid 2-letter passthrough.
 */
export function normalizeCountryToIso2(raw: string, isoByAlias: Map<string, string>): string | null {
  const k = raw.trim().toUpperCase()
  if (k === '') return 'XX'
  const hit = isoByAlias.get(k)
  if (hit) return hit
  if (k.length === 2 && /^[A-Z]{2}$/.test(k)) return k
  return null
}

function cell(row: string[], idx: Map<string, number>, key: string): string {
  const i = idx.get(key)
  if (i === undefined) return ''
  return (row[i] ?? '').trim()
}

/** Single display_name for DB: full column or "First Last". */
export function resolveAthleteDisplayName(row: string[], idx: Map<string, number>): string {
  const full = cell(row, idx, 'athlete_display_name')
  if (full) return full
  const first = cell(row, idx, 'first_name')
  const last = cell(row, idx, 'last_name')
  return [first, last].filter(Boolean).join(' ').trim()
}

export function parseBool(raw: string, rowNumber: number, field: string): boolean | ResultsImportRowError {
  const s = raw.trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes' || s === 'da') return true
  if (s === 'false' || s === '0' || s === 'no' || s === 'ne') return false
  return { rowNumber, message: `Invalid boolean for ${field}: "${raw}"` }
}

function parseNum(raw: string): number | null {
  const s = raw.trim()
  if (s === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** For new competitions: empty -> 0. */
export function parseFinishedJumpRoundsOrZero(raw: string, rowNumber: number): number | ResultsImportRowError {
  const s = raw.trim()
  if (s === '') return 0
  const n = Number(s.replace(',', '.'))
  if (!Number.isFinite(n)) {
    return { rowNumber, message: `Invalid competition_finished_jump_rounds: "${raw}"` }
  }
  const i = Math.round(n)
  if (i < 0 || i > 32767) {
    return { rowNumber, message: 'competition_finished_jump_rounds must be between 0 and 32767.' }
  }
  return i
}

/** For updates: empty -> skip (null). */
export function parseFinishedJumpRoundsOptional(
  raw: string,
  rowNumber: number,
): number | null | ResultsImportRowError {
  const s = raw.trim()
  if (s === '') return null
  const n = Number(s.replace(',', '.'))
  if (!Number.isFinite(n)) {
    return { rowNumber, message: `Invalid competition_finished_jump_rounds: "${raw}"` }
  }
  const i = Math.round(n)
  if (i < 0 || i > 32767) {
    return { rowNumber, message: 'competition_finished_jump_rounds must be between 0 and 32767.' }
  }
  return i
}

/** Smallint place 0..80 for WALAR PointsPlace row; empty ok. */
export function parsePlace(raw: string): number | null {
  const n = parseNum(raw)
  if (n === null) return null
  const i = Math.round(n)
  if (i < 0 || i > 80) return null
  return i
}

function normalizeAgeCategory(raw: string | null): string {
  return (raw ?? '').trim().toLowerCase()
}

export function sumResultCm(payload: ResultsImportPayload): number | null {
  const vals = [
    payload.jump1_cm,
    payload.jump2_cm,
    payload.jump3_cm,
    payload.jump4_cm,
    payload.jump5_cm,
    payload.jump6_cm,
    payload.jump7_cm,
    payload.jump8_cm,
    payload.sf_cm,
    payload.f_cm,
  ].filter((v): v is number => typeof v === 'number')
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0)
}

function derivePlaceField(
  entries: PendingResultRow[],
  field: PlaceField,
  predicate: (e: PendingResultRow) => boolean,
) {
  const candidates = entries
    .filter((e) => predicate(e) && e.totalCm !== null)
    .sort((a, b) => (a.totalCm! === b.totalCm! ? a.rowNumber - b.rowNumber : a.totalCm! - b.totalCm!))

  let prevTotal: number | null = null
  let prevRank = 0

  candidates.forEach((entry, idx) => {
    const rank = entry.totalCm === prevTotal ? prevRank : idx + 1
    prevTotal = entry.totalCm
    prevRank = rank
    if (entry.payload[field] === null) {
      entry.payload[field] = rank
    }
  })
}

export function deriveMissingPlaces(entries: PendingResultRow[]) {
  const byCompetition = new Map<string, PendingResultRow[]>()
  for (const entry of entries) {
    const list = byCompetition.get(entry.competitionId)
    if (list) list.push(entry)
    else byCompetition.set(entry.competitionId, [entry])
  }

  for (const compRows of byCompetition.values()) {
    derivePlaceField(compRows, 'place_overall', () => true)
    derivePlaceField(compRows, 'place_m', (e) => e.gender === 'M')
    derivePlaceField(compRows, 'place_f', (e) => e.gender === 'F')
    derivePlaceField(compRows, 'place_j', (e) => normalizeAgeCategory(e.ageCategory) === 'junior')
    derivePlaceField(
      compRows,
      'place_mj',
      (e) => e.gender === 'M' && normalizeAgeCategory(e.ageCategory) === 'junior',
    )
    derivePlaceField(
      compRows,
      'place_fj',
      (e) => e.gender === 'F' && normalizeAgeCategory(e.ageCategory) === 'junior',
    )
    derivePlaceField(compRows, 'place_master', (e) => normalizeAgeCategory(e.ageCategory) === 'master')
  }
}

/** YYYY-MM-DD for Postgres, or null. */
export function parseImportDate(
  raw: string,
  rowNumber: number,
  field: string,
): string | null | ResultsImportRowError {
  const s = raw.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const t = Date.parse(`${s}T12:00:00`)
    if (Number.isNaN(t)) return { rowNumber, message: `Invalid date for ${field}: "${raw}"` }
    return s
  }
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const y = m[3]!
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      return { rowNumber, message: `Invalid date for ${field}: "${raw}"` }
    }
    const iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const t = Date.parse(`${iso}T12:00:00`)
    if (Number.isNaN(t)) return { rowNumber, message: `Invalid date for ${field}: "${raw}"` }
    return iso
  }
  return {
    rowNumber,
    message: `Unrecognized date for ${field}: "${raw}" (use YYYY-MM-DD or DD.MM.YYYY)`,
  }
}

export type ResultsImportSummary = {
  rowsProcessed: number
  rowsUpserted: number
  competitionsRecalculated: string[]
  /** Labels for which a new `competitions` row was inserted during this import. */
  competitionsAutoCreated: string[]
  errors: ResultsImportRowError[]
}

export function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function noteCompetitionAutoCreated(summary: ResultsImportSummary, label: string) {
  if (!summary.competitionsAutoCreated.includes(label)) {
    summary.competitionsAutoCreated.push(label)
  }
}


export async function importResultsCsv(
  client: SupabaseClient,
  rows: string[][],
): Promise<ResultsImportSummary> {
  const summary: ResultsImportSummary = {
    rowsProcessed: 0,
    rowsUpserted: 0,
    competitionsRecalculated: [],
    competitionsAutoCreated: [],
    errors: [],
  }

  // Brza klijent-side validacija headera prije slanja na server
  if (rows.length < 2) {
    summary.errors.push({ rowNumber: 0, message: 'CSV must include a header row and at least one data row.' })
    return summary
  }
  const idx = buildHeaderIndex(rows[0]!)
  const headerErr = validateResultsHeaders(idx)
  if (headerErr) {
    summary.errors.push({ rowNumber: 1, message: headerErr })
    return summary
  }

  const { data: result, error } = await client.functions.invoke('admin-csv-import', {
    body: { rows },
  })

  if (error) {
    summary.errors.push({ rowNumber: 0, message: error.message })
    return summary
  }

  return result as ResultsImportSummary
}
