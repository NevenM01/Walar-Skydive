import type { PostgrestError } from '@supabase/supabase-js'
import type { NewsPost, NewsPostAdmin } from '../types'
import { getSupabaseBrowserClient } from './supabaseClient'

type NewsRow = {
  id: string
  title: string
  excerpt: string
  body: string | null
  category: string
  published_at: string
  is_published: boolean
  author_name: string
  image_urls: string[] | null
  /** Present only when selected from DB (admin / priority queries). */
  is_home_priority?: boolean
}

function isMissingDbColumn(error: PostgrestError, columnName: string): boolean {
  const m = (error.message ?? '').toLowerCase()
  const col = columnName.toLowerCase()
  return m.includes('does not exist') && m.includes(col)
}

function formatNewsPostgrestError(error: PostgrestError): string {
  const msg = error.message ?? ''
  const code = error.code ?? ''

  if (
    code === '42501' ||
    msg.toLowerCase().includes('permission denied') ||
    msg.toLowerCase().includes('row-level security')
  ) {
    return 'No permission to save news. In Supabase set profiles.is_admin = true for your user, then sign out and sign in again. If the error persists, run all migrations for walar_news_posts.'
  }

  if (code === '42P01' || (msg.includes('does not exist') && msg.includes('relation'))) {
    return 'News table is missing. Apply migrations that create public.walar_news_posts.'
  }

  if (msg.includes('column') && msg.includes('does not exist')) {
    return 'Database is missing columns (author_name, image_urls, body, or is_home_priority). Apply the latest news migrations from supabase/migrations.'
  }

  if (
    msg.includes('schema cache') ||
    (msg.includes('body') && msg.toLowerCase().includes('walar_news_posts'))
  ) {
    return 'The database is missing the news body column. Open Supabase Dashboard → SQL → run: alter table public.walar_news_posts add column if not exists body text not null default \'\'; then save the post again.'
  }

  return msg || 'Request failed.'
}

function mapPublishedAt(row: NewsRow): string {
  return row.published_at.slice(0, 10)
}

function normalizeImageUrls(row: NewsRow): string[] {
  const u = row.image_urls
  if (!Array.isArray(u)) return []
  return u.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function mapPublic(row: NewsRow): NewsPost {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body ?? '',
    category: row.category,
    publishedAt: mapPublishedAt(row),
    authorName: row.author_name?.trim() ?? '',
    imageUrls: normalizeImageUrls(row),
  }
}

function mapAdmin(row: NewsRow): NewsPostAdmin {
  return {
    ...mapPublic(row),
    isPublished: row.is_published,
    isHomePriority: Boolean(row.is_home_priority),
  }
}

/** Public list/detail/home — works before `is_home_priority` migration is applied. */
const selectColsPublic =
  'id, title, excerpt, body, category, published_at, is_published, author_name, image_urls'

const selectColsAdmin = `${selectColsPublic}, is_home_priority`

export async function fetchNewsPostsFromSupabase(): Promise<NewsPost[]> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await sb
    .from('walar_news_posts')
    .select(selectColsPublic)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (error) {
    throw new Error(formatNewsPostgrestError(error))
  }
  return (data as NewsRow[]).map(mapPublic)
}

export async function fetchNewsPostByIdFromSupabase(id: string): Promise<NewsPost | null> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const { data, error } = await sb
    .from('walar_news_posts')
    .select(selectColsPublic)
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    throw new Error(formatNewsPostgrestError(error))
  }
  if (!data) return null
  return mapPublic(data as NewsRow)
}

export async function fetchNewsPostsForAdminFromSupabase(): Promise<NewsPostAdmin[]> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }
  const first = await sb
    .from('walar_news_posts')
    .select(selectColsAdmin)
    .order('published_at', { ascending: false })

  if (first.error && isMissingDbColumn(first.error, 'is_home_priority')) {
    const retry = await sb
      .from('walar_news_posts')
      .select(selectColsPublic)
      .order('published_at', { ascending: false })
    if (retry.error) {
      throw new Error(formatNewsPostgrestError(retry.error))
    }
    return ((retry.data ?? []) as NewsRow[]).map((r) => mapAdmin({ ...r, is_home_priority: false }))
  }

  if (first.error) {
    throw new Error(formatNewsPostgrestError(first.error))
  }
  return (first.data as NewsRow[]).map(mapAdmin)
}

/** Up to 2 published posts for the home strip: pinned + latest other, or two latest. */
export async function fetchHomepageNewsStripFromSupabase(): Promise<NewsPost[]> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    throw new Error('Supabase is not configured.')
  }

  const { data: recentRows, error: errRecent } = await sb
    .from('walar_news_posts')
    .select(selectColsPublic)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3)

  if (errRecent) {
    throw new Error(formatNewsPostgrestError(errRecent))
  }

  const recent = (recentRows ?? []) as NewsRow[]

  const { data: priorityRow, error: errPriority } = await sb
    .from('walar_news_posts')
    .select(selectColsPublic)
    .eq('is_published', true)
    .eq('is_home_priority', true)
    .maybeSingle()

  if (errPriority) {
    if (isMissingDbColumn(errPriority, 'is_home_priority')) {
      return recent.slice(0, 2).map(mapPublic)
    }
    throw new Error(formatNewsPostgrestError(errPriority))
  }

  if (!priorityRow) {
    return recent.slice(0, 2).map(mapPublic)
  }

  const priority = priorityRow as NewsRow
  const second = recent.find((r) => r.id !== priority.id)
  if (second) {
    return [mapPublic(priority), mapPublic(second)]
  }
  return [mapPublic(priority)]
}

export type NewsPostUpsertPayload = {
  title: string
  excerpt: string
  body: string
  category: string
  publishedAt: string
  isPublished: boolean
  authorName: string
  imageUrls: string[]
  isHomePriority: boolean
}

export async function insertNewsPostInSupabase(
  payload: NewsPostUpsertPayload,
): Promise<NewsPostAdmin> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-news-write', {
    body: {
      action: 'insert',
      payload: {
        title: payload.title.trim(),
        excerpt: payload.excerpt.trim(),
        body: payload.body.trim(),
        category: payload.category.trim() || 'General',
        published_at: payload.publishedAt.slice(0, 10),
        is_published: payload.isPublished,
        author_name: payload.authorName.trim(),
        image_urls: payload.imageUrls.filter((u) => u.trim().length > 0),
        is_home_priority: payload.isHomePriority,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapAdmin(result.data as NewsRow)
}

export async function updateNewsPostInSupabase(
  id: string,
  payload: NewsPostUpsertPayload,
): Promise<NewsPostAdmin> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-news-write', {
    body: {
      action: 'update',
      payload: {
        id,
        title: payload.title.trim(),
        excerpt: payload.excerpt.trim(),
        body: payload.body.trim(),
        category: payload.category.trim() || 'General',
        published_at: payload.publishedAt.slice(0, 10),
        is_published: payload.isPublished,
        author_name: payload.authorName.trim(),
        image_urls: payload.imageUrls.filter((u) => u.trim().length > 0),
        is_home_priority: payload.isHomePriority,
      },
    },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  return mapAdmin(result.data as NewsRow)
}

export async function deleteNewsPostInSupabase(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: result, error } = await sb.functions.invoke('admin-news-write', {
    body: { action: 'delete', payload: { id } },
  })
  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
}
