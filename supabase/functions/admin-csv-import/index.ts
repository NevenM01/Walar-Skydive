import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, json, handleCors } from '../_shared/adminClient.ts'
import { iso2ToSportCode } from '../_shared/countryCodes.ts'

// ── Types ────────────────────────────────────────────────────────────────────

type ResultsImportRowError = { rowNumber: number; message: string }
type ResultsGender = 'M' | 'F'
type PlaceField =
  | 'place_overall' | 'place_m' | 'place_f'
  | 'place_j' | 'place_mj' | 'place_fj' | 'place_master'

type ResultsImportPayload = {
  competition_id: string; athlete_id: string
  start_number: string | null; team: string | null
  jump1_cm: number | null; jump2_cm: number | null; jump3_cm: number | null
  jump4_cm: number | null; jump5_cm: number | null; jump6_cm: number | null
  jump7_cm: number | null; jump8_cm: number | null
  sf_cm: number | null; f_cm: number | null
  tb1_cm: number | null; tb2_cm: number | null; tb3_cm: number | null
  tb4_cm: number | null; tb5_cm: number | null; tb6_cm: number | null
  member_national_team: boolean; age_category: string | null; wpc_medalist: boolean
  place_overall: number | null; place_m: number | null; place_f: number | null
  place_j: number | null; place_mj: number | null; place_fj: number | null
  place_master: number | null
}

type PendingResultRow = {
  rowNumber: number; competitionId: string; gender: ResultsGender
  ageCategory: string | null; totalCm: number | null; payload: ResultsImportPayload
}

type ResultsImportSummary = {
  rowsProcessed: number; rowsUpserted: number
  competitionsRecalculated: string[]; competitionsAutoCreated: string[]
  errors: ResultsImportRowError[]
}

// ── Header synonym map (same as frontend) ────────────────────────────────────

const HEADER_SYNONYMS: Record<string, string> = {
  // Competition identity
  oznaka_natjecanja: 'competition_unique_label', natjecanje: 'competition_unique_label',
  competition_label: 'competition_unique_label', id_natjecanja: 'competition_id',
  competition_uuid: 'competition_id',
  // Excel native: "Uniqe Competition" (intentional typo in Excel)
  uniqe_competition: 'competition_unique_label', unique_competition: 'competition_unique_label',

  // Competition display name
  naziv_natjecanja: 'competition_display_name', ime_dogadaja: 'competition_display_name',
  event_name: 'competition_display_name',
  // Excel native: "Competition" column
  competition: 'competition_display_name',

  // Competition location
  lokacija_natjecanja: 'competition_location', mjesto_natjecanja: 'competition_location',
  // Excel native: "Place" column (competition city)
  place: 'competition_location',

  // Competition dates
  datum_pocetka_natjecanja: 'competition_start_date', datum_pocetka: 'competition_start_date',
  datum_kraja_natjecanja: 'competition_end_date', datum_kraja: 'competition_end_date',
  // Excel native: "Date of Competition"
  date_of_competition: 'competition_start_date',

  // Competition rounds
  finished_jump_rounds: 'competition_finished_jump_rounds', finished_rounds: 'competition_finished_jump_rounds',
  zavrsene_runde: 'competition_finished_jump_rounds', broj_rundi: 'competition_finished_jump_rounds',
  zavrsen_krug: 'competition_finished_jump_rounds', runde: 'competition_finished_jump_rounds',
  competition_finished_jump_rounds: 'competition_finished_jump_rounds',
  // Excel native: "Jump Rounds"
  jump_rounds: 'competition_finished_jump_rounds',

  // Competition rang
  competition_rang: 'competition_rang_code', rang_natjecanja: 'competition_rang_code',
  competition_rank: 'competition_rang_code', walar_rang: 'competition_rang_code',
  // Excel native: "Competition Rang"
  competition_rang_code: 'competition_rang_code',

  // Athlete name
  ime_natjecatelja: 'athlete_display_name', athlete_name: 'athlete_display_name',
  prezime_i_ime: 'athlete_display_name', full_name: 'athlete_display_name',
  // Excel native: "Competitor"
  competitor: 'athlete_display_name',

  // First/last name
  ime: 'first_name', first: 'first_name', given_name: 'first_name', forename: 'first_name',
  prezime: 'last_name', surname: 'last_name', family_name: 'last_name',

  // Country
  drzava: 'country_code', država: 'country_code', country: 'country_code',
  // Excel native: "Nation"
  nation: 'country_code',

  // Gender
  spol: 'gender', sex: 'gender',

  // GDPR
  gdpr_pristanak: 'gdpr_consent_given', gdpr_consent: 'gdpr_consent_given',
  pristanak_gdpr: 'gdpr_consent_given', gdpr: 'gdpr_consent_given',
  objavi_puno_ime: 'gdpr_publish_full_name', publish_full_name: 'gdpr_publish_full_name',

  // National team
  reprezentacija: 'member_national_team', repka: 'member_national_team',
  clan_reprezentacije: 'member_national_team', national_team: 'member_national_team',
  national_team_member: 'member_national_team', member_of_national_team: 'member_national_team',
  member_nt: 'member_national_team',
  // Excel native: "Member of National Team"
  member_of_national_team_excel: 'member_national_team',

  // Age category
  kategorija: 'age_category', dobna_kategorija: 'age_category',

  // Date of birth
  date_of_birth: 'date_of_birth', birth_date: 'date_of_birth', birthdate: 'date_of_birth',
  datum_rodenja: 'date_of_birth', datum_rođenja: 'date_of_birth',
  // Excel native: "DoB"
  dob: 'date_of_birth',

  // WPC medalist
  wpc_medalja: 'wpc_medalist', wpc: 'wpc_medalist',

  // FAI licence
  fai_licence: 'fai_licence', fai_license: 'fai_licence', fai_id: 'fai_licence',
  fai_licenca: 'fai_licence', fai_broj: 'fai_licence',
  // Excel native: "FAI ID Licence"
  fai_id_licence: 'fai_licence',

  // Jumps (Croatian + generic)
  skok_1: 'jump1_cm', skok_2: 'jump2_cm', skok_3: 'jump3_cm', skok_4: 'jump4_cm',
  skok_5: 'jump5_cm', skok_6: 'jump6_cm', skok_7: 'jump7_cm', skok_8: 'jump8_cm',
  jump_1: 'jump1_cm', jump_2: 'jump2_cm', jump_3: 'jump3_cm', jump_4: 'jump4_cm',
  jump_5: 'jump5_cm', jump_6: 'jump6_cm', jump_7: 'jump7_cm', jump_8: 'jump8_cm',
  // Excel native: "1. ", "2.", "3. " etc. → after normHeader become "1", "2", "3"
  '1': 'jump1_cm', '2': 'jump2_cm', '3': 'jump3_cm', '4': 'jump4_cm',
  '5': 'jump5_cm', '6': 'jump6_cm', '7': 'jump7_cm', '8': 'jump8_cm',
  // Excel native: "SF" and "F" columns (semi-final and final round)
  sf: 'sf_cm', f: 'f_cm',

  // Tie-breaks
  tb_1: 'tb1_cm', tb1: 'tb1_cm', tb1_cm: 'tb1_cm', tb_round_1: 'tb1_cm', tie_break_1: 'tb1_cm', dodatni_skok_1: 'tb1_cm',
  tb_2: 'tb2_cm', tb2: 'tb2_cm', tb2_cm: 'tb2_cm', tb_round_2: 'tb2_cm', tie_break_2: 'tb2_cm', dodatni_skok_2: 'tb2_cm',
  tb_3: 'tb3_cm', tb3: 'tb3_cm', tb3_cm: 'tb3_cm', tb_round_3: 'tb3_cm', tie_break_3: 'tb3_cm', dodatni_skok_3: 'tb3_cm',
  tb_4: 'tb4_cm', tb4: 'tb4_cm', tb4_cm: 'tb4_cm', tb_round_4: 'tb4_cm', tie_break_4: 'tb4_cm', dodatni_skok_4: 'tb4_cm',
  tb_5: 'tb5_cm', tb5: 'tb5_cm', tb5_cm: 'tb5_cm', tb_round_5: 'tb5_cm', tie_break_5: 'tb5_cm', dodatni_skok_5: 'tb5_cm',
  tb_6: 'tb6_cm', tb6: 'tb6_cm', tb6_cm: 'tb6_cm', tb_round_6: 'tb6_cm', tie_break_6: 'tb6_cm', dodatni_skok_6: 'tb6_cm',
  // Excel native: single "TB" column → tb1_cm
  tb: 'tb1_cm',

  // Start number & team
  startni_broj: 'start_number', start: 'start_number',
  momcad: 'team', momčad: 'team', klub: 'team',

  // Place columns
  place_mf: 'place_overall', place_m_f: 'place_overall', plasman_mf: 'place_overall',
  plasman_apsolutni: 'place_overall', mjesto_mf: 'place_overall',
  // Excel native: "Place M+F" → after normHeader: "place_mf" (+ removed) ✓ already above
  place_m: 'place_m', plasman_m: 'place_m', mjesto_m: 'place_m',
  place_f: 'place_f', plasman_z: 'place_f', mjesto_z: 'place_f',
  place_j: 'place_j', plasman_j: 'place_j', mjesto_juniors: 'place_j',
  place_mj: 'place_mj', mjesto_junior_m: 'place_mj',
  place_fj: 'place_fj', mjesto_junior_z: 'place_fj',
  place_master: 'place_master', plasman_master: 'place_master',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_]/gu, '')
}

function buildHeaderIndex(headerRow: string[]): Map<string, number> {
  const m = new Map<string, number>()
  headerRow.forEach((cell, i) => {
    const raw = normHeader(cell)
    if (!raw) return
    m.set(HEADER_SYNONYMS[raw] ?? raw, i)
  })
  return m
}

const EXCEL_ERRORS = new Set(['#N/A', '#VALUE!', '#REF!', '#DIV/0!', '#NUM!', '#NAME?', '#NULL!'])

function cell(row: string[], idx: Map<string, number>, key: string): string {
  const i = idx.get(key)
  const v = i === undefined ? '' : (row[i] ?? '').trim()
  return EXCEL_ERRORS.has(v) ? '' : v
}

// Splits "Claudio Carbone SCUOLA NAZIONALE ITALY" → { name: "Claudio Carbone", team: "SCUOLA NAZIONALE ITALY" }
// Detects transition from TitleCase words to ALL-CAPS words (2+ chars).
function splitNameAndTeam(raw: string): { name: string; team: string | null } {
  const trimmed = raw.trim()
  const words = trimmed.split(/\s+/)
  // Find first word index that starts an all-caps sequence (word is 2+ chars, all uppercase)
  let splitAt = -1
  for (let i = 1; i < words.length; i++) {
    const w = words[i]!
    if (w.length >= 2 && /^[A-Z0-9]+$/.test(w)) {
      splitAt = i
      break
    }
  }
  if (splitAt === -1) return { name: trimmed, team: null }
  return {
    name: words.slice(0, splitAt).join(' '),
    team: words.slice(splitAt).join(' '),
  }
}

function resolveAthleteDisplayName(row: string[], idx: Map<string, number>): { name: string; embeddedTeam: string | null } {
  const full = cell(row, idx, 'athlete_display_name')
  if (full) return splitNameAndTeam(full)
  const name = [cell(row, idx, 'first_name'), cell(row, idx, 'last_name')].filter(Boolean).join(' ').trim()
  return { name, embeddedTeam: null }
}

function parseBool(raw: string, rowNumber: number, field: string): boolean | ResultsImportRowError {
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

function parseFinishedJumpRoundsOrZero(raw: string, rowNumber: number): number | ResultsImportRowError {
  const s = raw.trim()
  if (s === '') return 0
  const n = Number(s.replace(',', '.'))
  if (!Number.isFinite(n)) return { rowNumber, message: `Invalid competition_finished_jump_rounds: "${raw}"` }
  const i = Math.round(n)
  if (i < 0 || i > 32767) return { rowNumber, message: 'competition_finished_jump_rounds must be between 0 and 32767.' }
  return i
}

function parseFinishedJumpRoundsOptional(raw: string, rowNumber: number): number | null | ResultsImportRowError {
  const s = raw.trim()
  if (s === '') return null
  const n = Number(s.replace(',', '.'))
  if (!Number.isFinite(n)) return { rowNumber, message: `Invalid competition_finished_jump_rounds: "${raw}"` }
  const i = Math.round(n)
  if (i < 0 || i > 32767) return { rowNumber, message: 'competition_finished_jump_rounds must be between 0 and 32767.' }
  return i
}

function parsePlace(raw: string): number | null {
  const n = parseNum(raw)
  if (n === null) return null
  const i = Math.round(n)
  return i >= 0 && i <= 80 ? i : null
}

function parseImportDate(raw: string, rowNumber: number, field: string): string | null | ResultsImportRowError {
  const s = raw.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    if (Number.isNaN(Date.parse(`${s}T12:00:00`))) return { rowNumber, message: `Invalid date for ${field}: "${raw}"` }
    return s
  }
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (m) {
    const day = Number(m[1]), month = Number(m[2]), y = m[3]!
    if (day < 1 || day > 31 || month < 1 || month > 12) return { rowNumber, message: `Invalid date for ${field}: "${raw}"` }
    const iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (Number.isNaN(Date.parse(`${iso}T12:00:00`))) return { rowNumber, message: `Invalid date for ${field}: "${raw}"` }
    return iso
  }
  return { rowNumber, message: `Unrecognized date for ${field}: "${raw}" (use YYYY-MM-DD or DD.MM.YYYY)` }
}

function normalizeCountryToIso2(raw: string, isoByAlias: Map<string, string>): string | null {
  const k = raw.trim().toUpperCase()
  if (k === '') return null
  const hit = isoByAlias.get(k)
  if (hit) return hit
  if (k.length === 2 && /^[A-Z]{2}$/.test(k)) return k
  return null
}

function sumResultCm(p: ResultsImportPayload): number | null {
  const vals = [p.jump1_cm, p.jump2_cm, p.jump3_cm, p.jump4_cm, p.jump5_cm, p.jump6_cm, p.jump7_cm, p.jump8_cm, p.sf_cm, p.f_cm]
    .filter((v): v is number => typeof v === 'number')
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null
}

function derivePlaceField(entries: PendingResultRow[], field: PlaceField, pred: (e: PendingResultRow) => boolean) {
  const candidates = entries.filter(e => pred(e) && e.totalCm !== null)
    .sort((a, b) => a.totalCm! === b.totalCm! ? a.rowNumber - b.rowNumber : a.totalCm! - b.totalCm!)
  let prevTotal: number | null = null, prevRank = 0
  candidates.forEach((entry, idx) => {
    const rank = entry.totalCm === prevTotal ? prevRank : idx + 1
    prevTotal = entry.totalCm; prevRank = rank
    if (entry.payload[field] === null) entry.payload[field] = rank
  })
}

function deriveMissingPlaces(entries: PendingResultRow[]) {
  const byComp = new Map<string, PendingResultRow[]>()
  for (const e of entries) {
    const list = byComp.get(e.competitionId)
    if (list) list.push(e); else byComp.set(e.competitionId, [e])
  }
  for (const rows of byComp.values()) {
    derivePlaceField(rows, 'place_overall', () => true)
    derivePlaceField(rows, 'place_m', e => e.gender === 'M')
    derivePlaceField(rows, 'place_f', e => e.gender === 'F')
    derivePlaceField(rows, 'place_j', e => (e.ageCategory ?? '').trim().toLowerCase() === 'junior')
    derivePlaceField(rows, 'place_mj', e => e.gender === 'M' && (e.ageCategory ?? '').trim().toLowerCase() === 'junior')
    derivePlaceField(rows, 'place_fj', e => e.gender === 'F' && (e.ageCategory ?? '').trim().toLowerCase() === 'junior')
    derivePlaceField(rows, 'place_master', e => (e.ageCategory ?? '').trim().toLowerCase() === 'master')
  }
}

async function resolveCompetitionIdFromLabel(
  client: SupabaseClient, compLabel: string, row: string[],
  idx: Map<string, number>, rowNumber: number,
  cache: Map<string, string>, summary: ResultsImportSummary,
): Promise<string | null> {
  const cached = cache.get(compLabel)
  if (cached) return cached

  const { data: existing, error: selErr } = await client
    .from('competitions').select('id').eq('unique_label', compLabel).limit(1).maybeSingle()

  if (selErr) {
    summary.errors.push({ rowNumber, message: `Competition lookup failed: ${selErr.message}` })
    return null
  }
  if (existing?.id) { cache.set(compLabel, existing.id as string); return existing.id as string }

  const displayName = cell(row, idx, 'competition_display_name') || compLabel
  const location = cell(row, idx, 'competition_location') || 'TBD'
  const startRaw = cell(row, idx, 'competition_start_date')
  const endRaw = cell(row, idx, 'competition_end_date')

  let startIso: string, endIso: string
  if (!startRaw && !endRaw) {
    const t = new Date().toISOString().slice(0, 10)
    startIso = t; endIso = t
  } else {
    const sParsed = parseImportDate(startRaw || endRaw, rowNumber, 'competition_start_date')
    const eParsed = parseImportDate(endRaw || startRaw, rowNumber, 'competition_end_date')
    if (typeof sParsed !== 'string') { if (sParsed) summary.errors.push(sParsed); else summary.errors.push({ rowNumber, message: 'competition_start_date is required.' }); return null }
    if (typeof eParsed !== 'string') { if (eParsed) summary.errors.push(eParsed); else summary.errors.push({ rowNumber, message: 'competition_end_date is required.' }); return null }
    startIso = sParsed; endIso = eParsed
  }

  if (startIso > endIso) { summary.errors.push({ rowNumber, message: 'competition_start_date must be on or before competition_end_date.' }); return null }

  const rangCode = cell(row, idx, 'competition_rang_code').trim() || null
  const frParsed = parseFinishedJumpRoundsOrZero(cell(row, idx, 'competition_finished_jump_rounds'), rowNumber)
  if (typeof frParsed !== 'number') { summary.errors.push(frParsed); return null }

  const { data: inserted, error: insErr } = await client.from('competitions')
    .insert({ unique_label: compLabel, name: displayName, location, start_date: startIso, end_date: endIso, finished_jump_rounds: frParsed, ...(rangCode ? { competition_rang_code: rangCode } : {}) })
    .select('id').single()

  if (!insErr && inserted?.id) {
    const id = inserted.id as string
    cache.set(compLabel, id)
    if (!summary.competitionsAutoCreated.includes(compLabel)) summary.competitionsAutoCreated.push(compLabel)
    return id
  }

  // Race condition: retry on duplicate key
  const isDup = insErr && (insErr.code === '23505' || /duplicate key|unique constraint/i.test(insErr.message ?? ''))
  if (isDup) {
    const { data: again } = await client.from('competitions').select('id').eq('unique_label', compLabel).limit(1).maybeSingle()
    if (again?.id) { cache.set(compLabel, again.id as string); return again.id as string }
  }

  summary.errors.push({ rowNumber, message: `Could not create competition for label "${compLabel}": ${insErr?.message ?? 'unknown'}` })
  return null
}

// ── Main import logic ─────────────────────────────────────────────────────────

async function importResultsCsv(client: SupabaseClient, rpcClient: SupabaseClient, rows: string[][]): Promise<ResultsImportSummary> {
  const summary: ResultsImportSummary = { rowsProcessed: 0, rowsUpserted: 0, competitionsRecalculated: [], competitionsAutoCreated: [], errors: [] }

  if (rows.length < 2) { summary.errors.push({ rowNumber: 0, message: 'CSV must include a header row and at least one data row.' }); return summary }

  const idx = buildHeaderIndex(rows[0]!)
  const REQUIRED = ['country_code', 'gender', 'gdpr_consent_given']
  for (const h of REQUIRED) {
    if (!idx.has(h)) { summary.errors.push({ rowNumber: 1, message: `Missing required column: ${h}` }); return summary }
  }
  if (!idx.has('competition_unique_label') && !idx.has('competition_id')) { summary.errors.push({ rowNumber: 1, message: 'Missing competition_unique_label or competition_id' }); return summary }
  if (!idx.has('athlete_display_name') && !(idx.has('first_name') && idx.has('last_name'))) { summary.errors.push({ rowNumber: 1, message: 'Missing athlete name column(s).' }); return summary }

  const { data: aliasRows, error: aliasErr } = await client.from('country_aliases').select('alias, iso2')
  if (aliasErr) { summary.errors.push({ rowNumber: 0, message: `country_aliases: ${aliasErr.message}` }); return summary }

  const isoByAlias = new Map<string, string>()
  for (const r of aliasRows ?? []) {
    const rec = r as { alias: string; iso2: string }
    isoByAlias.set(String(rec.alias ?? '').trim().toUpperCase(), String(rec.iso2 ?? '').trim().toUpperCase())
  }

  const competitionIdsToRecalc = new Set<string>()
  const labelIdCache = new Map<string, string>()
  const pendingUpserts: PendingResultRow[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!
    if (row.every(c => !String(c).trim())) continue
    const rowNumber = r + 1
    summary.rowsProcessed++

    const compIdRaw = cell(row, idx, 'competition_id')
    const compLabel = cell(row, idx, 'competition_unique_label')
    let competitionId: string | null = null

    if (compIdRaw) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(compIdRaw)) { summary.errors.push({ rowNumber, message: `Invalid competition_id UUID: ${compIdRaw}` }); continue }
      competitionId = compIdRaw
    } else if (compLabel) {
      const id = await resolveCompetitionIdFromLabel(client, compLabel, row, idx, rowNumber, labelIdCache, summary)
      if (!id) continue
      competitionId = id
    } else { summary.errors.push({ rowNumber, message: 'competition_id or competition_unique_label is required.' }); continue }

    const rangCodeRow = cell(row, idx, 'competition_rang_code').trim()
    if (rangCodeRow) {
      const { error: rangErr } = await client.from('competitions').update({ competition_rang_code: rangCodeRow, updated_at: new Date().toISOString() }).eq('id', competitionId)
      if (rangErr) { summary.errors.push({ rowNumber, message: `competition_rang_code update failed: ${rangErr.message}` }); continue }
    }

    const frUpd = parseFinishedJumpRoundsOptional(cell(row, idx, 'competition_finished_jump_rounds'), rowNumber)
    if (frUpd !== null && typeof frUpd !== 'number') { summary.errors.push(frUpd); continue }
    if (typeof frUpd === 'number') {
      const { error: fjErr } = await client.from('competitions').update({ finished_jump_rounds: frUpd, updated_at: new Date().toISOString() }).eq('id', competitionId)
      if (fjErr) { summary.errors.push({ rowNumber, message: `competition_finished_jump_rounds update failed: ${fjErr.message}` }); continue }
    }

    const { name, embeddedTeam } = resolveAthleteDisplayName(row, idx)
    const countryRaw = cell(row, idx, 'country_code')
    const iso2 = normalizeCountryToIso2(countryRaw, isoByAlias)
    if (!iso2) { summary.errors.push({ rowNumber, message: `Unknown country_code "${countryRaw.trim()}"` }); continue }
    const country = iso2ToSportCode(iso2)

    const genderRaw = cell(row, idx, 'gender').toUpperCase()
    if (genderRaw !== 'M' && genderRaw !== 'F') { summary.errors.push({ rowNumber, message: `gender must be M or F, got "${genderRaw}"` }); continue }
    if (!name) { summary.errors.push({ rowNumber, message: 'Athlete name is empty.' }); continue }

    const gdprConsent = parseBool(cell(row, idx, 'gdpr_consent_given'), rowNumber, 'gdpr_consent_given')
    if (typeof gdprConsent !== 'boolean') { summary.errors.push(gdprConsent); continue }

    const pubRaw = cell(row, idx, 'gdpr_publish_full_name')
    let gdprPublish = false
    if (pubRaw) {
      const p = parseBool(pubRaw, rowNumber, 'gdpr_publish_full_name')
      if (typeof p !== 'boolean') { summary.errors.push(p); continue }
      gdprPublish = p
    }

    const ntRaw = cell(row, idx, 'member_national_team')
    const memberNationalTeam = ntRaw === '' ? false : parseBool(ntRaw, rowNumber, 'member_national_team')
    if (typeof memberNationalTeam !== 'boolean') { summary.errors.push(memberNationalTeam); continue }

    const medalRaw = cell(row, idx, 'wpc_medalist')
    const wpcMedalist = medalRaw === '' ? false : parseBool(medalRaw, rowNumber, 'wpc_medalist')
    if (typeof wpcMedalist !== 'boolean') { summary.errors.push(wpcMedalist); continue }

    const ageCategory = cell(row, idx, 'age_category') || null
    const dobParsed = parseImportDate(cell(row, idx, 'date_of_birth'), rowNumber, 'date_of_birth')
    if (typeof dobParsed !== 'string' && dobParsed !== null) { summary.errors.push(dobParsed); continue }

    const faiLic = cell(row, idx, 'fai_licence').trim() || null
    const athleteIdCol = cell(row, idx, 'athlete_id')
    let athleteId: string | null = null

    if (athleteIdCol) {
      const { data: a, error: aErr } = await client.from('athletes').select('id').eq('id', athleteIdCol).maybeSingle()
      if (aErr || !a?.id) { summary.errors.push({ rowNumber, message: `Unknown athlete_id ${athleteIdCol}` }); continue }
      athleteId = a.id as string
      const patch: Record<string, unknown> = {}
      if (dobParsed) patch.date_of_birth = dobParsed
      if (faiLic !== null) patch.fai_licence = faiLic
      if (Object.keys(patch).length > 0) {
        patch.updated_at = new Date().toISOString()
        const { error: patchErr } = await client.from('athletes').update(patch).eq('id', athleteId)
        if (patchErr) { summary.errors.push({ rowNumber, message: `athlete update failed: ${patchErr.message}` }); continue }
      }
    } else {
      // Prefer matching by FAI licence when present (prevents duplicates from name/country variations).
      if (faiLic) {
        const { data: byFai, error: faiErr } = await client
          .from('athletes')
          .select('id, country_code, display_name')
          .ilike('fai_licence', faiLic)
          .limit(1)
          .maybeSingle()
        if (faiErr) { summary.errors.push({ rowNumber, message: `Athlete lookup by FAI failed: ${faiErr.message}` }); continue }
        if (byFai?.id) {
          athleteId = byFai.id as string
        }
      }

      if (!athleteId) {
        const { data: found, error: findErr } = await client
          .from('athletes')
          .select('id')
          .eq('country_code', country)
          .ilike('display_name', name.trim())
          .limit(1)
          .maybeSingle()
        if (findErr) { summary.errors.push({ rowNumber, message: `Athlete lookup failed: ${findErr.message}` }); continue }
        if (found?.id) athleteId = found.id as string
      }

      if (athleteId) {
        const upd: Record<string, unknown> = {
          gender: genderRaw,
          gdpr_consent_given: gdprConsent,
          gdpr_publish_full_name: gdprPublish,
          updated_at: new Date().toISOString(),
        }
        if (dobParsed) upd.date_of_birth = dobParsed
        if (faiLic !== null) upd.fai_licence = faiLic
        const { error: upErr } = await client.from('athletes').update(upd).eq('id', athleteId)
        if (upErr) { summary.errors.push({ rowNumber, message: `Athlete update failed: ${upErr.message}` }); continue }
      } else {
        const { data: inserted, error: insErr } = await client.from('athletes')
          .insert({
            display_name: name.trim(),
            country_code: country,
            gender: genderRaw,
            gdpr_consent_given: gdprConsent,
            gdpr_publish_full_name: gdprPublish,
            ...(dobParsed ? { date_of_birth: dobParsed } : {}),
            ...(faiLic !== null ? { fai_licence: faiLic } : {}),
          })
          .select('id')
          .single()
        if (insErr || !inserted?.id) { summary.errors.push({ rowNumber, message: `Athlete insert failed: ${insErr?.message ?? 'unknown'}` }); continue }
        athleteId = inserted.id as string
      }
    }

    const payload: ResultsImportPayload = {
      competition_id: competitionId, athlete_id: athleteId,
      start_number: cell(row, idx, 'start_number') || null,
      team: cell(row, idx, 'team') || embeddedTeam || null,
      jump1_cm: parseNum(cell(row, idx, 'jump1_cm')), jump2_cm: parseNum(cell(row, idx, 'jump2_cm')),
      jump3_cm: parseNum(cell(row, idx, 'jump3_cm')), jump4_cm: parseNum(cell(row, idx, 'jump4_cm')),
      jump5_cm: parseNum(cell(row, idx, 'jump5_cm')), jump6_cm: parseNum(cell(row, idx, 'jump6_cm')),
      jump7_cm: parseNum(cell(row, idx, 'jump7_cm')), jump8_cm: parseNum(cell(row, idx, 'jump8_cm')),
      sf_cm: parseNum(cell(row, idx, 'sf_cm')), f_cm: parseNum(cell(row, idx, 'f_cm')),
      tb1_cm: parseNum(cell(row, idx, 'tb1_cm')), tb2_cm: parseNum(cell(row, idx, 'tb2_cm')),
      tb3_cm: parseNum(cell(row, idx, 'tb3_cm')), tb4_cm: parseNum(cell(row, idx, 'tb4_cm')),
      tb5_cm: parseNum(cell(row, idx, 'tb5_cm')), tb6_cm: parseNum(cell(row, idx, 'tb6_cm')),
      member_national_team: memberNationalTeam, age_category: ageCategory, wpc_medalist: wpcMedalist,
      place_overall: parsePlace(cell(row, idx, 'place_overall')), place_m: parsePlace(cell(row, idx, 'place_m')),
      place_f: parsePlace(cell(row, idx, 'place_f')), place_j: parsePlace(cell(row, idx, 'place_j')),
      place_mj: parsePlace(cell(row, idx, 'place_mj')), place_fj: parsePlace(cell(row, idx, 'place_fj')),
      place_master: parsePlace(cell(row, idx, 'place_master')),
    }
    pendingUpserts.push({ rowNumber, competitionId, gender: genderRaw as ResultsGender, ageCategory, totalCm: sumResultCm(payload), payload })
  }

  deriveMissingPlaces(pendingUpserts)

  for (const entry of pendingUpserts) {
    const { error: upResErr } = await client.from('competition_results').upsert(entry.payload, { onConflict: 'competition_id,athlete_id' })
    if (upResErr) { summary.errors.push({ rowNumber: entry.rowNumber, message: upResErr.message }); continue }
    summary.rowsUpserted++
    competitionIdsToRecalc.add(entry.competitionId)
  }

  for (const cid of competitionIdsToRecalc) {
    const { error: rpcErr } = await rpcClient.rpc('walar_admin_recalculate_competition', { p_competition_id: cid })
    if (rpcErr) summary.errors.push({ rowNumber: 0, message: `Recalculate failed for ${cid}: ${rpcErr.message}` })
    else summary.competitionsRecalculated.push(cid)
  }

  return summary
}

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const auth = await requireAdmin(req)
  if (auth.error) return json({ error: auth.error }, auth.status)
  const { adminClient } = auth

  // RPC checks auth.uid() — must use user JWT client
  const authHeader = req.headers.get('Authorization')!
  const rpcClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const body = await req.json()
  const { rows } = body as { rows: string[][] }

  if (!Array.isArray(rows)) return json({ error: 'rows must be a string[][] array' }, 400)

  const summary = await importResultsCsv(adminClient, rpcClient, rows)
  return json(summary)
})
