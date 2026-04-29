export type GdprFlags = {
  publishFullName: boolean
  consentGiven: boolean
}

export type Athlete = {
  id: string
  userId?: string | null
  displayName: string
  countryCode: string
  /** 'M' or 'F' (from DB). Optional in client type because not all UIs need it. */
  gender?: 'M' | 'F'
  /** YYYY-MM-DD (from DB). Optional on client type; admin can edit it. */
  dateOfBirth?: string | null
  /**
   * How to display DOB publicly:
   * - 'age' => "24 yrs"
   * - 'date' => "21.10.2001"
   */
  dobDisplayMode?: 'age' | 'date'
  /** May be empty. Optional because some UIs only show public fields. */
  faiLicence?: string | null
  /** Signed/public URL for display (may be short-lived). */
  avatarUrl?: string
  /** Storage path in private bucket (used for signed URL minting). */
  avatarPath?: string | null
  /** Storage path awaiting admin approval. */
  pendingAvatarPath?: string | null
  pendingAvatarUpdatedAt?: string | null
  rankingPoints: number
  gdprFlags: GdprFlags
  competitionsCount: number
  bestRoundCm: number | null
  bio?: string | null
  club?: string | null
  websiteUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
}

export type CompetitionStatus =
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'results_published'

export type Competition = {
  id: string
  name: string
  startDate: string
  endDate: string
  location: string
  category: string
  status: CompetitionStatus
  faiClass?: string
  description?: string
  /** Matches Excel "Competition label" / CSV import when set. */
  uniqueLabel?: string
}

export type LeaderboardRow = {
  rank: number
  athleteId: string
  totalPoints: number
  eventsCount: number
  bestRoundCm: number | null
}

export type LeaderboardFilters = {
  category: string
  window: string
  faiClass: string
  /** MVP: all | M | F */
  gender: 'all' | 'M' | 'F'
  /** Filter athletes by FAI licence presence. */
  licence: 'all' | 'fai_only'
  /** When set, ranks by scores at this competition only (UUID). */
  competitionId: string | null
}

export type NewsPost = {
  id: string
  title: string
  excerpt: string
  /** Full article text; shown on the post detail page. */
  body: string
  publishedAt: string
  category: string
  /** Byline; may be empty. */
  authorName: string
  /** Public image URLs; first is card cover, rest for gallery. */
  imageUrls: string[]
}

/** Admin list/edit — includes drafts (isPublished false). */
export type NewsPostAdmin = NewsPost & {
  isPublished: boolean
  /** At most one post may be true; homepage strip uses this with latest other post. */
  isHomePriority: boolean
}

/** Sponsor/advertiser rows appear under Partners; supporter under Supporters on /partners. */
export type ProjectPartnerKind = 'sponsor' | 'advertiser' | 'supporter'

export type ProjectPartner = {
  id: string
  name: string
  url: string
  kind: ProjectPartnerKind
  /** Short line, e.g. “Drop zone” or “Equipment retailer”. */
  tagline?: string
  /** Lower values sort first within the same kind. */
  sortOrder: number
}
