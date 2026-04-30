import { getSupabaseBrowserClient } from './supabaseClient'

export type PartnerInquiryRow = {
  id: string
  created_at: string
  organization_name: string
  contact_name: string
  email: string
  phone: string | null
  message: string | null
}

const INQUIRY_SELECT =
  'id, created_at, organization_name, contact_name, email, phone, message' as const

export async function fetchPartnerInquiriesFromSupabase(params: {
  offset: number
  limit: number
}): Promise<{ rows: PartnerInquiryRow[]; total: number }> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const from = Math.max(0, params.offset)
  const to = Math.max(from, from + Math.max(1, params.limit) - 1)

  const { data, error, count } = await sb
    .from('walar_partner_inquiries')
    .select(INQUIRY_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  return {
    rows: (data ?? []) as PartnerInquiryRow[],
    total: count ?? 0,
  }
}

export async function deletePartnerInquiryFromSupabase(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { error } = await sb.from('walar_partner_inquiries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
