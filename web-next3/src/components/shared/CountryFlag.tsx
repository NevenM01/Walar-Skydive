import { sportCodeToIso2 } from '../../lib/sportCountryCode'

interface CountryFlagProps {
  countryCode: string
  /** Optional precomputed flag URL (preferred when available). */
  flagUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-4 h-3',
  md: 'w-5 h-4',
  lg: 'w-6 h-5',
}

/**
 * Renders an SVG-based country flag using flagcdn.com.
 * Falls back to a muted placeholder on error (no broken image).
 */
export function CountryFlag({ countryCode, flagUrl, size = 'md', className = '' }: CountryFlagProps) {
  const iso2 = sportCodeToIso2(countryCode).toLowerCase()
  const src = flagUrl?.trim() ? flagUrl : `https://flagcdn.com/${iso2}.svg`
  return (
    <img
      src={src}
      alt={countryCode}
      className={`${sizes[size]} object-cover rounded-[2px] inline-block shrink-0 ${className}`}
      onError={e => {
        const t = e.currentTarget
        t.style.display = 'none'
      }}
      loading="lazy"
    />
  )
}
