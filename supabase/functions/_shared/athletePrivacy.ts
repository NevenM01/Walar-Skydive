/** Shared public-athlete privacy helpers. No Deno APIs — importable from Vitest. */

export type PublicDisplayInput = {
  displayName: string
  publishFullName: boolean
  avatarUrl?: string | null
  faiLicence?: string | null
}

export type PublicDisplayOutput = {
  displayName: string
  avatarUrl: string | null
  faiLicence: string | null
}

/** First given name plus last-name initial, e.g. "Olga Balina" → "Olga B." */
export function maskDisplayName(fullName: string): string {
  const parts = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0] ?? ''
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''
  const initial = last.charAt(0)
  if (!initial) return first
  return `${first} ${initial.toUpperCase()}.`
}

function parseIsoDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  return new Date(y, mo - 1, d)
}

/** Whole years since date of birth. Never returns the date itself. */
export function ageFromDob(dob: string | null | undefined, asOf: Date = new Date()): number | null {
  if (dob == null) return null
  const raw = String(dob).trim()
  if (!raw) return null
  const born = parseIsoDateOnly(raw)
  if (!born) return null
  let age = asOf.getFullYear() - born.getFullYear()
  const monthDiff = asOf.getMonth() - born.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < born.getDate())) {
    age -= 1
  }
  if (age < 0 || age > 150) return null
  return age
}

export function toPublicAthleteDisplay(input: PublicDisplayInput): PublicDisplayOutput {
  const name = String(input.displayName ?? '')
  if (input.publishFullName) {
    return {
      displayName: name.trim(),
      avatarUrl: String(input.avatarUrl ?? '').trim() || null,
      faiLicence: String(input.faiLicence ?? '').trim() || null,
    }
  }
  return {
    displayName: maskDisplayName(name),
    avatarUrl: null,
    faiLicence: null,
  }
}

export type LeaderboardPrivacyRow = {
  id: string
  gdpr_publish_full_name: boolean | null
  avatar_url: string | null
  fai_licence: string | null
  date_of_birth: string | null
}

/** Map one RPC leaderboard row + privacy lookup into the public JSON shape. */
export function mapPublicLeaderboardRow(
  rpc: {
    rank: number
    athleteId: string
    totalPoints: number
    eventsCount: number
    displayName: string
    gender: string
    countrySportCode: string
    countryIso2: string
    countryFlagUrl: string | null
  },
  privacy: LeaderboardPrivacyRow | undefined,
  asOf?: Date,
): {
  rank: number
  athleteId: string
  totalPoints: number
  eventsCount: number
  displayName: string
  gender: string
  avatarUrl: string | null
  faiLicence: string | null
  age: number | null
  gdprPublishFullName: boolean
  countrySportCode: string
  countryIso2: string
  countryFlagUrl: string | null
} {
  const publish = Boolean(privacy?.gdpr_publish_full_name)
  const shown = toPublicAthleteDisplay({
    displayName: rpc.displayName,
    publishFullName: publish,
    avatarUrl: privacy?.avatar_url ?? null,
    faiLicence: privacy?.fai_licence ?? null,
  })
  return {
    rank: rpc.rank,
    athleteId: rpc.athleteId,
    totalPoints: rpc.totalPoints,
    eventsCount: rpc.eventsCount,
    displayName: shown.displayName,
    gender: rpc.gender,
    avatarUrl: shown.avatarUrl,
    faiLicence: shown.faiLicence,
    age: ageFromDob(privacy?.date_of_birth ?? null, asOf),
    gdprPublishFullName: publish,
    countrySportCode: rpc.countrySportCode,
    countryIso2: rpc.countryIso2,
    countryFlagUrl: rpc.countryFlagUrl,
  }
}
