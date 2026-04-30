import { getSupabaseBrowserClient } from './supabaseClient'

export type AthleteDuplicateRow = {
  group_type: 'fai' | 'fai_mismatch' | 'name' | 'name_fuzzy' | 'name_country' | 'name_dob' | 'name_core'
  group_key: string
  id: string
  display_name: string
  country_code: string
  date_of_birth: string | null
  fai_licence: string | null
  user_id: string | null
  created_at: string
  updated_at: string
  results_count: number
  similarity: number | null
}

export async function fetchAthleteDuplicatesReport(): Promise<AthleteDuplicateRow[]> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')
  const { data, error } = await sb.rpc('admin_athlete_duplicates_report')
  if (error) throw new Error(error.message)
  return (data ?? []) as AthleteDuplicateRow[]
}

export async function mergeAthletesSafe(params: { winnerId: string; loserIds: string[]; reason?: string | null }): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')
  const { error } = await sb.rpc('merge_athletes_safe', {
    p_winner_id: params.winnerId,
    p_loser_ids: params.loserIds,
    p_reason: params.reason ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function mergeAthletesSafeClearJunkDob(params: { winnerId: string; loserIds: string[]; reason?: string | null }): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')
  const { error } = await sb.rpc('merge_athletes_safe_clear_junk_dob', {
    p_winner_id: params.winnerId,
    p_loser_ids: params.loserIds,
    p_reason: params.reason ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function mergeAthletesSafeClearLoserDob(params: { winnerId: string; loserIds: string[]; reason?: string | null }): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')
  const { error } = await sb.rpc('merge_athletes_safe_clear_loser_dob', {
    p_winner_id: params.winnerId,
    p_loser_ids: params.loserIds,
    p_reason: params.reason ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function autoMergeAthletesNameDob(params?: { groupLimit?: number }): Promise<{
  merged_groups: number
  merged_athletes: number
  skipped_groups: number
}> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')
  const { data, error } = await sb.rpc('auto_merge_athletes_name_dob', {
    p_group_limit: params?.groupLimit ?? 200,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return mergeCountsFromRpcRow(row)
}

export async function autoMergeAthletesNameCore(params?: { groupLimit?: number }): Promise<{
  merged_groups: number
  merged_athletes: number
  skipped_groups: number
}> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')
  const { data, error } = await sb.rpc('auto_merge_athletes_name_core', {
    p_group_limit: params?.groupLimit ?? 200,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return mergeCountsFromRpcRow(row)
}

function mergeCountsFromRpcRow(row: unknown): {
  merged_groups: number
  merged_athletes: number
  skipped_groups: number
} {
  const r = row as Record<string, unknown>
  return {
    merged_groups: Number(r.merged_groups ?? 0),
    merged_athletes: Number(r.merged_athletes ?? 0),
    skipped_groups: Number(r.skipped_groups ?? 0),
  }
}

