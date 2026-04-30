import { requireAdmin, json, handleCors } from '../_shared/adminClient.ts'

type ApprovePayload = {
  requestId: string
  resolvedAthleteId: string
  inviteEmail?: string | null
}

type RejectPayload = {
  requestId: string
  reason?: string | null
}

type InvitePayload = {
  requestId: string
  inviteEmail?: string | null
}

type Body =
  | { action: 'approve'; payload: ApprovePayload }
  | { action: 'reject'; payload: RejectPayload }
  | { action: 'invite'; payload: InvitePayload }

async function findUserIdByEmail(
  adminClient: any,
  email: string,
): Promise<string | null> {
  // supabase-js doesn't provide getUserByEmail; list and match.
  const target = email.trim().toLowerCase()
  const perPage = 200
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>
    const found = users.find((u) => (u.email ?? '').toLowerCase() === target)
    if (found?.id) return found.id
    if (users.length < perPage) break
  }
  return null
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAdmin(req)
  if (auth.error) return json({ error: auth.error }, auth.status)
  const { adminClient, userId: adminUserId } = auth

  const body = (await req.json().catch(() => null)) as Body | null
  if (!body || typeof (body as any).action !== 'string') return json({ error: 'Invalid JSON body' }, 400)

  if (body.action === 'reject') {
    const payload = body.payload
    const requestId = String(payload?.requestId ?? '').trim()
    if (!requestId) return json({ error: 'requestId is required' }, 400)
    const reason = (payload?.reason ?? null)?.toString().trim() || null

    const { data: reqRow, error: rErr } = await adminClient
      .from('athlete_profile_edit_requests')
      .select('id, status')
      .eq('id', requestId)
      .single()
    if (rErr) return json({ error: rErr.message }, 500)
    if (!reqRow) return json({ error: 'Request not found' }, 404)
    if (reqRow.status !== 'pending') return json({ error: 'Request is not pending' }, 400)

    const { data, error } = await adminClient
      .from('athlete_profile_edit_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: adminUserId,
        rejection_reason: reason,
      })
      .eq('id', requestId)
      .select()
      .single()
    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  if (body.action === 'invite') {
    const payload = body.payload
    const requestId = String(payload?.requestId ?? '').trim()
    if (!requestId) return json({ error: 'requestId is required' }, 400)

    const { data: reqRow, error: rErr } = await adminClient
      .from('athlete_profile_edit_requests')
      .select('id, email')
      .eq('id', requestId)
      .single()
    if (rErr) return json({ error: rErr.message }, 500)
    if (!reqRow) return json({ error: 'Request not found' }, 404)

    const inviteEmail = (payload?.inviteEmail ?? reqRow.email ?? '').toString().trim().toLowerCase()
    if (!inviteEmail) return json({ error: 'Email is required' }, 400)

    // Prefer lookup first to avoid hitting invite rate limits for already-registered users.
    const existingUserId = await findUserIdByEmail(adminClient, inviteEmail)
    if (existingUserId) {
      return json({ data: { email: inviteEmail, userId: existingUserId, invited: false } })
    }

    const inviteFn = (adminClient as any)?.auth?.admin?.inviteUserByEmail
    if (typeof inviteFn !== 'function') {
      return json({ error: 'Admin invite API is not available in this environment.' }, 500)
    }

    const { data: invited, error: iErr } = await inviteFn.call(adminClient.auth.admin, inviteEmail)
    if (iErr) return json({ error: iErr.message }, 500)
    const userId = (invited?.user?.id ?? null) as string | null
    if (!userId) return json({ error: 'Invite succeeded but user id is missing.' }, 500)

    return json({ data: { email: inviteEmail, userId, invited: true } })
  }

  if (body.action === 'approve') {
    const payload = body.payload
    const requestId = String(payload?.requestId ?? '').trim()
    const resolvedAthleteId = String(payload?.resolvedAthleteId ?? '').trim()
    if (!requestId) return json({ error: 'requestId is required' }, 400)
    if (!resolvedAthleteId) return json({ error: 'resolvedAthleteId is required' }, 400)

    const { data: reqRow, error: rErr } = await adminClient
      .from('athlete_profile_edit_requests')
      .select('id, status, email')
      .eq('id', requestId)
      .single()
    if (rErr) return json({ error: rErr.message }, 500)
    if (!reqRow) return json({ error: 'Request not found' }, 404)
    if (reqRow.status !== 'pending') return json({ error: 'Request is not pending' }, 400)

    const inviteEmail = (payload?.inviteEmail ?? reqRow.email ?? '').toString().trim().toLowerCase()
    if (!inviteEmail) return json({ error: 'Email is required' }, 400)

    // 1) Invite (or locate existing) auth user
    let linkedUserId: string | null = null
    const inviteFn = (adminClient as any)?.auth?.admin?.inviteUserByEmail
    if (typeof inviteFn === 'function') {
      const { data: invited, error: iErr } = await inviteFn.call(adminClient.auth.admin, inviteEmail)
      if (iErr) {
        // Common case: already registered. Try to locate by email.
        linkedUserId = await findUserIdByEmail(adminClient, inviteEmail)
        if (!linkedUserId) return json({ error: iErr.message }, 500)
      } else {
        linkedUserId = (invited?.user?.id ?? null) as string | null
      }
    } else {
      // Fallback: locate existing user; if not found, hard fail (better than silently creating without email link).
      linkedUserId = await findUserIdByEmail(adminClient, inviteEmail)
      if (!linkedUserId) return json({ error: 'Admin invite API is not available in this environment.' }, 500)
    }

    if (!linkedUserId) return json({ error: 'Failed to obtain linked user id' }, 500)

    // 2) Link athlete.user_id
    const { data: athleteRow, error: aErr } = await adminClient
      .from('athletes')
      .select('id, user_id')
      .eq('id', resolvedAthleteId)
      .single()
    if (aErr) return json({ error: aErr.message }, 500)
    if (!athleteRow) return json({ error: 'Athlete not found' }, 404)
    if (athleteRow.user_id && athleteRow.user_id !== linkedUserId) {
      return json({ error: 'Athlete is already linked to a different user.' }, 400)
    }

    const { error: linkErr } = await adminClient
      .from('athletes')
      .update({ user_id: linkedUserId, updated_at: new Date().toISOString() })
      .eq('id', resolvedAthleteId)
    if (linkErr) return json({ error: linkErr.message }, 500)

    // 3) Mark request approved
    const { data, error } = await adminClient
      .from('athlete_profile_edit_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUserId,
        linked_user_id: linkedUserId,
        resolved_athlete_id: resolvedAthleteId,
      })
      .eq('id', requestId)
      .select()
      .single()
    if (error) return json({ error: error.message }, 500)
    return json({ data })
  }

  return json({ error: `Unknown action: ${(body as any).action}` }, 400)
})

