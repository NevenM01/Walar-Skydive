import { getSupabaseBrowserClient } from './supabaseClient'

export type ProfileEditRequestStatus = 'pending' | 'approved' | 'rejected'

export type ProfileEditRequestRow = {
  id: string
  created_at: string
  status: ProfileEditRequestStatus
  email: string
  athlete_id: string | null
  athlete_search_text: string | null
  manual_full_name: string | null
  manual_country_code: string | null
  manual_fai_licence: string | null
  manual_year_of_birth: number | null
  id_document_path: string | null
  message: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  linked_user_id: string | null
  resolved_athlete_id: string | null
}

const REQUEST_SELECT =
  'id, created_at, status, email, athlete_id, athlete_search_text, manual_full_name, manual_country_code, manual_fai_licence, manual_year_of_birth, id_document_path, message, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, linked_user_id, resolved_athlete_id' as const

export async function fetchIdDocumentSignedUrl(path: string): Promise<string> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: res, error } = await sb.functions.invoke('admin-id-document-signed-url', {
    body: { path },
  })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(res.error)
  const url = res?.data?.signedUrl as string | undefined
  if (!url) throw new Error('Failed to create signed URL.')
  return url
}

export async function fetchProfileEditRequestsFromSupabase(params: {
  status?: ProfileEditRequestStatus | 'all'
  offset: number
  limit: number
}): Promise<{ rows: ProfileEditRequestRow[]; total: number }> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const from = Math.max(0, params.offset)
  const to = Math.max(from, from + Math.max(1, params.limit) - 1)

  let req = sb
    .from('athlete_profile_edit_requests')
    .select(REQUEST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    req = req.eq('status', params.status)
  }

  const { data, error, count } = await req.range(from, to)
  if (error) throw new Error(error.message)

  return {
    rows: (data ?? []) as ProfileEditRequestRow[],
    total: count ?? 0,
  }
}

export async function approveProfileEditRequest(params: {
  requestId: string
  resolvedAthleteId: string
  inviteEmail?: string | null
}): Promise<ProfileEditRequestRow> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: res, error } = await sb.functions.invoke('admin-profile-edit-requests', {
    body: {
      action: 'approve',
      payload: {
        requestId: params.requestId,
        resolvedAthleteId: params.resolvedAthleteId,
        inviteEmail: params.inviteEmail ?? null,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(res.error)
  return res.data as ProfileEditRequestRow
}

export async function sendInviteForProfileEditRequest(params: {
  requestId: string
  inviteEmail?: string | null
}): Promise<{ email: string; userId: string; invited: boolean }> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: res, error } = await sb.functions.invoke('admin-profile-edit-requests', {
    body: {
      action: 'invite',
      payload: {
        requestId: params.requestId,
        inviteEmail: params.inviteEmail ?? null,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(res.error)
  return res.data as { email: string; userId: string; invited: boolean }
}

export async function rejectProfileEditRequest(params: {
  requestId: string
  reason?: string | null
}): Promise<ProfileEditRequestRow> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: res, error } = await sb.functions.invoke('admin-profile-edit-requests', {
    body: {
      action: 'reject',
      payload: {
        requestId: params.requestId,
        reason: params.reason ?? null,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(res.error)
  return res.data as ProfileEditRequestRow
}

