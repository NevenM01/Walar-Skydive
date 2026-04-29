import { getSupabaseBrowserClient } from './supabaseClient'

export type PartnerInquiryPayload = {
  organizationName: string
  contactName: string
  email: string
  phone: string | null
  message: string | null
}

export async function submitPartnerInquiry(payload: PartnerInquiryPayload): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { error } = await sb.from('walar_partner_inquiries').insert({
    organization_name: payload.organizationName,
    contact_name: payload.contactName,
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone,
    message: payload.message,
  })

  if (error) throw new Error(error.message)
}
