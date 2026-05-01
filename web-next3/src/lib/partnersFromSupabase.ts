import type { PostgrestError } from '@supabase/supabase-js'
import type { ProjectPartner, ProjectPartnerKind } from '../types'
import { getSupabaseAnonPublicClient, getSupabaseBrowserClient } from './supabaseClient'

type PartnerRow = {
  id: string
  name: string
  url: string
  kind: ProjectPartnerKind
  tagline: string | null
  sort_order: number
}

const KINDS: readonly ProjectPartnerKind[] = ['sponsor', 'advertiser', 'supporter'] as const

function isPartnerKind(s: string): s is ProjectPartnerKind {
  return (KINDS as readonly string[]).includes(s)
}

/** Thrown message fragment when PostgREST cannot resolve `walar_project_partners` (migration not applied). */
export const PARTNERS_TABLE_MISSING_MESSAGE =
  'Partners table is missing. Apply migrations that create public.walar_project_partners.'

export function isPartnersTableMissingError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e)
  const lower = m.toLowerCase()
  return (
    m.includes('walar_project_partners') ||
    m.includes(PARTNERS_TABLE_MISSING_MESSAGE) ||
    (lower.includes('schema cache') && lower.includes('could not find'))
  )
}

function formatPartnersError(error: PostgrestError): string {
  const msg = error.message ?? ''
  const code = error.code ?? ''
  const lower = msg.toLowerCase()

  if (
    msg.includes('walar_project_partners') ||
    (lower.includes('schema cache') && lower.includes('could not find')) ||
    code === '42P01' ||
    (msg.includes('does not exist') && msg.includes('relation'))
  ) {
    return PARTNERS_TABLE_MISSING_MESSAGE
  }

  if (
    code === '42501' ||
    lower.includes('permission denied') ||
    lower.includes('row-level security')
  ) {
    return 'No permission to change partners. Set profiles.is_admin = true for your user, then sign out and sign in again. Apply migrations for walar_project_partners if the table is missing.'
  }

  return msg || 'Request failed.'
}

function mapRow(row: PartnerRow): ProjectPartner {
  return {
    id: row.id,
    name: row.name.trim(),
    url: row.url.trim(),
    kind: row.kind,
    tagline: row.tagline?.trim() || undefined,
    sortOrder: row.sort_order,
  }
}

const selectCols = 'id, name, url, kind, tagline, sort_order'

export async function fetchProjectPartnersFromSupabase(): Promise<ProjectPartner[]> {
  const sb = getSupabaseAnonPublicClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await sb
    .from('walar_project_partners')
    .select(selectCols)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(formatPartnersError(error))
  }
  return (data as PartnerRow[]).filter((r) => isPartnerKind(r.kind)).map(mapRow)
}

export type ProjectPartnerUpsertPayload = {
  name: string
  url: string
  kind: ProjectPartnerKind
  tagline: string
  sortOrder: number
}

export async function insertProjectPartnerInSupabase(
  payload: ProjectPartnerUpsertPayload,
): Promise<ProjectPartner> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-partners-write', {
    body: {
      action: 'insert',
      payload: {
        name: payload.name.trim(),
        url: payload.url.trim(),
        kind: payload.kind,
        tagline: payload.tagline.trim() || null,
        sort_order: payload.sortOrder,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapRow(result.data as PartnerRow)
}

export async function updateProjectPartnerInSupabase(
  id: string,
  payload: ProjectPartnerUpsertPayload,
): Promise<ProjectPartner> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-partners-write', {
    body: {
      action: 'update',
      payload: {
        id,
        name: payload.name.trim(),
        url: payload.url.trim(),
        kind: payload.kind,
        tagline: payload.tagline.trim() || null,
        sort_order: payload.sortOrder,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapRow(result.data as PartnerRow)
}

export async function deleteProjectPartnerInSupabase(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-partners-write', {
    body: { action: 'delete', payload: { id } },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
}
