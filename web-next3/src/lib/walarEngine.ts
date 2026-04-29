/**
 * WALAR calculation helpers — mirror SQL in
 * supabase/migrations/20260326110000_walar_core_schema.sql and
 * supabase/migrations/20260326110400_walar_excel_parity.sql (PointsPlace, Excel WALARIN).
 */

export type JumpTotals = {
  totalCm: number
  jumpRounds: number
  avgCm: number | null
}

/** Sum/count/avg over rounds 1–8 + SF + F (Excel N:W). */
export function walarJumpTotals(
  j1: number | null | undefined,
  j2: number | null | undefined,
  j3: number | null | undefined,
  j4: number | null | undefined,
  j5: number | null | undefined,
  j6: number | null | undefined,
  j7: number | null | undefined,
  j8: number | null | undefined,
  sf: number | null | undefined,
  f: number | null | undefined,
): JumpTotals {
  const vals = [j1, j2, j3, j4, j5, j6, j7, j8, sf, f].filter((v): v is number => v != null && !Number.isNaN(v))
  if (vals.length === 0) {
    return { totalCm: 0, jumpRounds: 0, avgCm: null }
  }
  const totalCm = vals.reduce((a, b) => a + b, 0)
  return {
    totalCm,
    jumpRounds: vals.length,
    avgCm: totalCm / vals.length,
  }
}

/**
 * Mirrors SQL walar_age_category_from_dates: junior if &lt;18 full years at comp end;
 * master if YEAR(compEnd) - YEAR(dob) &gt; 50; else senior.
 */
export function walarAgeCategoryFromDates(dob: Date, compEnd: Date): string | null {
  if (Number.isNaN(dob.getTime()) || Number.isNaN(compEnd.getTime()) || dob > compEnd) return null
  let fullYears = compEnd.getFullYear() - dob.getFullYear()
  const md = compEnd.getMonth() - dob.getMonth()
  if (md < 0 || (md === 0 && compEnd.getDate() < dob.getDate())) fullYears--
  if (fullYears < 18) return 'junior'
  if (compEnd.getFullYear() - dob.getFullYear() > 50) return 'master'
  return 'senior'
}

export function walarRankPoints(input: {
  memberNationalTeam: boolean
  ageCategory: string | null | undefined
  avgCm: number | null | undefined
  wpcMedalist: boolean
}): number {
  const cat = (input.ageCategory ?? '').trim().toLowerCase()
  let p = input.memberNationalTeam ? 3 : 1
  if (cat === 'junior') p += 1
  if ((input.avgCm ?? 0) > 10) p -= 1
  if (input.wpcMedalist) p += 2
  return Math.max(0, Math.min(5, p))
}

export function walarTierFromOp(op: number | null | undefined): string | null {
  if (op == null) return null
  if (op > 15000) return 'WALAR A'
  if (op > 10000) return 'WALAR B'
  if (op > 7500) return 'WALAR C'
  if (op > 4000) return 'WALAR D'
  if (op > 1500) return 'WALAR E'
  if (op > 500) return 'WALAR F'
  return 'Under'
}

/** Key: `${totalCm}:${jumpRounds}` for total_cm 0..160 and rounds 1..10 */
export type PointsCmMatrix = Map<string, number>

export function walarResultsPointsLookup(
  totalCm: number,
  jumpRounds: number,
  matrix: PointsCmMatrix,
): number {
  const tc = Math.min(160, Math.max(0, Math.floor(totalCm)))
  const jr = Math.min(10, Math.max(1, Math.round(jumpRounds)))
  return matrix.get(`${tc}:${jr}`) ?? 0
}

/** Key: `${place}:${walArIndex}` for place 1..80 and wal_ar_index 1..12 (Excel PointsPlace). */
export type PointsPlaceMatrix = Map<string, number>

/**
 * Excel WALARIN uses column AC (Place M) for males and column AD (Place F)
 * for females to look up placement rank points — subcategory columns (Place J,
 * Place MJ, Place FJ, Place Master) are informational only and do NOT feed
 * into the PointsPlace lookup.
 */
export function walarEffectivePlaceForPoints(input: {
  gender: string | null | undefined
  placeOverall: number | null | undefined
  placeM: number | null | undefined
  placeF: number | null | undefined
}): number | null {
  const g = (input.gender ?? '').trim().toUpperCase()
  if (g === 'F') return input.placeF ?? input.placeOverall ?? null
  return input.placeM ?? input.placeOverall ?? null
}

/** Mirrors SQL walar_placement_points_lookup. */
export function walarPlacementPointsLookup(
  place: number | null | undefined,
  walArIndex: number | null | undefined,
  matrix: PointsPlaceMatrix,
): number {
  if (place == null || place < 1 || place > 80) return 0
  if (walArIndex == null || walArIndex < 1 || walArIndex > 12) return 0
  return matrix.get(`${place}:${walArIndex}`) ?? 0
}

/** Excel WALARIN AY = AW + AX (placement points + results points). */
export function walarAthleteEventScore(placementPoints: number, resultsPoints: number): number {
  return placementPoints + resultsPoints
}
