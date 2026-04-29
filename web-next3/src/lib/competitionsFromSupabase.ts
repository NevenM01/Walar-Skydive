import type { Competition, CompetitionStatus } from '../types'
import { getSupabaseBrowserClient } from './supabaseClient'

type CompetitionRow = {
  id: string
  name: string
  start_date: string
  end_date: string
  location: string
  category: string
  status: CompetitionStatus
  fai_class: string | null
  description: string | null
  unique_label: string | null
}

function mapRow(row: CompetitionRow): Competition {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    category: row.category,
    status: row.status,
    faiClass: row.fai_class ?? undefined,
    description: row.description ?? undefined,
    uniqueLabel: row.unique_label ?? undefined,
  }
}

const COMPETITION_SELECT =
  'id, name, start_date, end_date, location, category, status, fai_class, description, unique_label' as const

export async function fetchCompetitionsFromSupabase(): Promise<Competition[]> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await sb.from('competitions').select(COMPETITION_SELECT).order('start_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }
  return (data as CompetitionRow[]).map(mapRow)
}

export async function fetchCompetitionByIdFromSupabase(
  id: string,
): Promise<Competition | null> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await sb.from('competitions').select(COMPETITION_SELECT).eq('id', id).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) return null
  return mapRow(data as CompetitionRow)
}

export type CompetitionInsertPayload = {
  name: string
  startDate: string
  endDate: string
  location: string
  category: string
  status: CompetitionStatus
  faiClass?: string
  description?: string
  /** Optional stable key for CSV import (must be unique when set). */
  uniqueLabel?: string
}

export async function insertCompetitionInSupabase(
  payload: CompetitionInsertPayload,
): Promise<Competition> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-competition-write', {
    body: {
      action: 'insert',
      payload: {
        name: payload.name.trim(),
        start_date: payload.startDate.slice(0, 10),
        end_date: payload.endDate.slice(0, 10),
        location: payload.location.trim(),
        category: payload.category.trim() || 'Open',
        status: payload.status,
        fai_class: payload.faiClass?.trim() || null,
        description: payload.description?.trim() || null,
        unique_label: payload.uniqueLabel?.trim() || null,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapRow(result.data as CompetitionRow)
}

export async function updateCompetitionUniqueLabelInSupabase(
  id: string,
  uniqueLabel: string,
): Promise<Competition> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-competition-write', {
    body: { action: 'update-label', payload: { id, unique_label: uniqueLabel } },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapRow(result.data as CompetitionRow)
}

export type CompetitionUpdatePayload = CompetitionInsertPayload

export async function updateCompetitionInSupabase(
  id: string,
  payload: CompetitionUpdatePayload,
): Promise<Competition> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-competition-write', {
    body: {
      action: 'update',
      payload: {
        id,
        name: payload.name.trim(),
        start_date: payload.startDate.slice(0, 10),
        end_date: payload.endDate.slice(0, 10),
        location: payload.location.trim(),
        category: payload.category.trim() || 'Open',
        status: payload.status,
        fai_class: payload.faiClass?.trim() || null,
        description: payload.description?.trim() || null,
        unique_label: payload.uniqueLabel?.trim() || null,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapRow(result.data as CompetitionRow)
}

export async function deleteCompetitionInSupabase(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-competition-write', {
    body: { action: 'delete', payload: { id } },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
}
