import { getSupabaseAnonPublicClient, getSupabaseBrowserClient } from './supabaseClient'

/** DB key in `walar_app_settings`; when true, leaderboard includes athletes without FAI licence number. */
export const SETTING_RANK_WITHOUT_FAI_LICENCE = 'rank_athletes_without_fai_licence'

export async function fetchRankWithoutFaiLicenceSetting(): Promise<boolean> {
  const sb = getSupabaseAnonPublicClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data, error } = await sb
    .from('walar_app_settings')
    .select('value')
    .eq('key', SETTING_RANK_WITHOUT_FAI_LICENCE)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const v = (data?.value as string | undefined)?.trim().toLowerCase()
  if (v === undefined || v === '') return true
  if (['true', '1', 'yes', 'on'].includes(v)) return true
  if (['false', '0', 'no', 'off'].includes(v)) return false
  return true
}

export async function setRankWithoutFaiLicenceSetting(enabled: boolean): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-settings-write', {
    body: { action: 'upsert-rank-without-fai', payload: { value: enabled } },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
}
