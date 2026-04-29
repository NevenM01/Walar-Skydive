import { getSupabaseBrowserClient } from './supabaseClient'

export type ProfileEditRequestPayload = {
  email: string
  athleteId?: string | null
  athleteSearchText?: string | null
  manualFullName?: string | null
  manualCountryCode?: string | null
  manualFaiLicence?: string | null
  manualYearOfBirth?: number | null
  idDocumentPath?: string | null
  message?: string | null
}

export type ProfileEditRequestResult = {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export async function submitProfileEditRequest(payload: ProfileEditRequestPayload): Promise<ProfileEditRequestResult> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('public-profile-edit-request', {
    body: payload,
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  if (!result?.data?.id) throw new Error('Request failed.')
  return result.data as ProfileEditRequestResult
}

