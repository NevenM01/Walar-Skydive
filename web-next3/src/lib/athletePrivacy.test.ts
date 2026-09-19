import { describe, expect, it } from 'vitest'
import {
  ageFromDob,
  mapPublicLeaderboardRow,
  maskDisplayName,
  toPublicAthleteDisplay,
} from '../../../supabase/functions/_shared/athletePrivacy'

describe('maskDisplayName', () => {
  it('returns first name plus last initial', () => {
    expect(maskDisplayName('Olga Balina')).toBe('Olga B.')
  })

  it('keeps a single token', () => {
    expect(maskDisplayName('Olga')).toBe('Olga')
  })

  it('uses the last token as the surname', () => {
    expect(maskDisplayName('Jean Claude Van Damme')).toBe('Jean D.')
  })

  it('trims whitespace and ignores empty input', () => {
    expect(maskDisplayName('  Olga   Balina  ')).toBe('Olga B.')
    expect(maskDisplayName('')).toBe('')
    expect(maskDisplayName('   ')).toBe('')
  })
})

describe('ageFromDob', () => {
  const asOf = new Date(2026, 8, 19)

  it('computes whole years', () => {
    expect(ageFromDob('2001-10-21', asOf)).toBe(24)
    expect(ageFromDob('2001-09-19', asOf)).toBe(25)
    expect(ageFromDob('2001-09-20', asOf)).toBe(24)
  })

  it('returns null for missing or invalid dates', () => {
    expect(ageFromDob(null, asOf)).toBeNull()
    expect(ageFromDob('', asOf)).toBeNull()
    expect(ageFromDob('not-a-date', asOf)).toBeNull()
  })
})

describe('toPublicAthleteDisplay', () => {
  it('keeps full name, avatar and licence when publishFullName is true', () => {
    expect(
      toPublicAthleteDisplay({
        displayName: 'Olga Balina',
        publishFullName: true,
        avatarUrl: 'uid/avatar.jpg',
        faiLicence: 'CRO-1',
      }),
    ).toEqual({
      displayName: 'Olga Balina',
      avatarUrl: 'uid/avatar.jpg',
      faiLicence: 'CRO-1',
    })
  })

  it('masks name and omits avatar and licence when publishFullName is false', () => {
    expect(
      toPublicAthleteDisplay({
        displayName: 'Olga Balina',
        publishFullName: false,
        avatarUrl: 'uid/avatar.jpg',
        faiLicence: 'CRO-1',
      }),
    ).toEqual({
      displayName: 'Olga B.',
      avatarUrl: null,
      faiLicence: null,
    })
  })
})

describe('mapPublicLeaderboardRow', () => {
  const rpc = {
    rank: 1,
    athleteId: 'a1',
    totalPoints: 10,
    eventsCount: 2,
    displayName: 'Olga Balina',
    gender: 'F',
    countrySportCode: 'CRO',
    countryIso2: 'HR',
    countryFlagUrl: 'https://flag',
  }

  it('masks and drops avatar when publish flag is false', () => {
    const out = mapPublicLeaderboardRow(
      rpc,
      {
        id: 'a1',
        gdpr_publish_full_name: false,
        avatar_url: 'user-uuid/avatar.jpg',
        fai_licence: 'CRO-1',
        date_of_birth: '2001-10-21',
      },
      new Date(2026, 8, 19),
    )
    expect(out.displayName).toBe('Olga B.')
    expect(out.avatarUrl).toBeNull()
    expect(out.faiLicence).toBeNull()
    expect(out.age).toBe(24)
    expect(out.gdprPublishFullName).toBe(false)
    expect(out).not.toHaveProperty('dateOfBirth')
    expect(out).not.toHaveProperty('userId')
  })

  it('keeps full name when publish flag is true', () => {
    const out = mapPublicLeaderboardRow(
      rpc,
      {
        id: 'a1',
        gdpr_publish_full_name: true,
        avatar_url: 'https://cdn/avatar.jpg',
        fai_licence: 'CRO-1',
        date_of_birth: '2001-10-21',
      },
      new Date(2026, 8, 19),
    )
    expect(out.displayName).toBe('Olga Balina')
    expect(out.avatarUrl).toBe('https://cdn/avatar.jpg')
    expect(out.faiLicence).toBe('CRO-1')
  })
})
