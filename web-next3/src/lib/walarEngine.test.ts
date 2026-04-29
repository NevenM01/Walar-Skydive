import { describe, expect, it } from 'vitest'
import {
  type PointsCmMatrix,
  type PointsPlaceMatrix,
  walarAgeCategoryFromDates,
  walarAthleteEventScore,
  walarEffectivePlaceForPoints,
  walarJumpTotals,
  walarPlacementPointsLookup,
  walarRankPoints,
  walarResultsPointsLookup,
  walarTierFromOp,
} from './walarEngine'

describe('walarJumpTotals', () => {
  it('sums N:W range including SF and F', () => {
    const r = walarJumpTotals(1, 1, 1, 2, 1, 1, 1, 1, null, null)
    expect(r.totalCm).toBe(9)
    expect(r.jumpRounds).toBe(8)
    expect(r.avgCm).toBeCloseTo(9 / 8, 5)
  })

  it('includes SF and F when present', () => {
    const r = walarJumpTotals(2, 2, 2, 2, 2, 2, 2, 2, 3, 4)
    expect(r.totalCm).toBe(23)
    expect(r.jumpRounds).toBe(10)
  })
})

describe('walarAgeCategoryFromDates', () => {
  it('classifies junior, senior, master like SQL', () => {
    expect(walarAgeCategoryFromDates(new Date('2010-03-01'), new Date('2025-06-01'))).toBe('junior')
    expect(walarAgeCategoryFromDates(new Date('1990-01-15'), new Date('2025-06-01'))).toBe('senior')
    expect(walarAgeCategoryFromDates(new Date('1970-01-01'), new Date('2025-01-01'))).toBe('master')
    expect(walarAgeCategoryFromDates(new Date('1975-01-01'), new Date('2025-01-01'))).toBe('senior')
  })

  it('returns null when dob after competition', () => {
    expect(walarAgeCategoryFromDates(new Date('2030-01-01'), new Date('2025-01-01'))).toBeNull()
  })
})

describe('walarRankPoints', () => {
  it('matches Excel base + junior + avg>10 + medal', () => {
    expect(
      walarRankPoints({
        memberNationalTeam: false,
        ageCategory: 'Senior',
        avgCm: 5,
        wpcMedalist: false,
      }),
    ).toBe(1)

    expect(
      walarRankPoints({
        memberNationalTeam: true,
        ageCategory: 'junior',
        avgCm: 11,
        wpcMedalist: true,
      }),
    ).toBe(5) // 3+1-1+2=5, clamped to max 5
  })

  it('floors at 0 for non-NT with avg > 10', () => {
    expect(
      walarRankPoints({
        memberNationalTeam: false,
        ageCategory: 'Senior',
        avgCm: 15,
        wpcMedalist: false,
      }),
    ).toBe(0) // 1-1=0
  })

  it('caps at 5', () => {
    expect(
      walarRankPoints({
        memberNationalTeam: true,
        ageCategory: 'junior',
        avgCm: 5,
        wpcMedalist: true,
      }),
    ).toBe(5) // 3+1+2=6 → clamped to 5
  })
})

describe('walarTierFromOp', () => {
  it('uses Excel thresholds', () => {
    expect(walarTierFromOp(20000)).toBe('WALAR A')
    expect(walarTierFromOp(12000)).toBe('WALAR B')
    expect(walarTierFromOp(400)).toBe('Under')
  })
})

describe('walarResultsPointsLookup', () => {
  it('reads PointsCM corner (0 cm, 4 rounds) = 250', () => {
    const m: PointsCmMatrix = new Map()
    m.set('0:4', 250)
    expect(walarResultsPointsLookup(0, 4, m)).toBe(250)
    expect(walarResultsPointsLookup(0.9, 4, m)).toBe(250)
  })
})

describe('walarEffectivePlaceForPoints', () => {
  it('uses Place M for males, Place F for females (Excel parity)', () => {
    expect(
      walarEffectivePlaceForPoints({
        gender: 'F',
        placeOverall: 9,
        placeM: 5,
        placeF: 4,
      }),
    ).toBe(4) // female → Place F

    expect(
      walarEffectivePlaceForPoints({
        gender: 'M',
        placeOverall: 9,
        placeM: 2,
        placeF: 99,
      }),
    ).toBe(2) // male → Place M
  })

  it('falls back to placeOverall when gender-specific is missing', () => {
    expect(
      walarEffectivePlaceForPoints({
        gender: 'M',
        placeOverall: 7,
        placeM: null,
        placeF: null,
      }),
    ).toBe(7)

    expect(
      walarEffectivePlaceForPoints({
        gender: 'F',
        placeOverall: 3,
        placeM: null,
        placeF: null,
      }),
    ).toBe(3)
  })

  it('returns null when all place columns are empty', () => {
    expect(
      walarEffectivePlaceForPoints({
        gender: 'M',
        placeOverall: null,
        placeM: null,
        placeF: null,
      }),
    ).toBeNull()
  })
})

describe('walarPlacementPointsLookup', () => {
  it('matches PointsPlace (1,9) sample from WALAR workbook', () => {
    const m: PointsPlaceMatrix = new Map()
    m.set('1:9', 350)
    expect(walarPlacementPointsLookup(1, 9, m)).toBe(350)
    expect(walarPlacementPointsLookup(81, 1, m)).toBe(0)
    expect(walarPlacementPointsLookup(1, 13, m)).toBe(0)
  })
})

describe('walarAthleteEventScore', () => {
  it('sums AW + AX like Excel WALAR score', () => {
    expect(walarAthleteEventScore(350, 250)).toBe(600)
  })
})
