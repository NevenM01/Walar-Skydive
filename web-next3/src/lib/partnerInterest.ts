import type { ProjectPartner } from '../types'

/** Matches placeholder partner rows used only as a visual CTA (replaced by the real Become a partner card). */
export function isBecomePartnerPlaceholder(partner: Pick<ProjectPartner, 'name' | 'url'>): boolean {
  const n = partner.name.trim().toLowerCase().replace(/\s+/g, ' ')
  if (n === 'become a partner' || n === 'becoma a partner') return true
  const u = partner.url.trim().toLowerCase()
  return u === '#become-partner' || u === 'internal:/partners/become-a-partner'
}
