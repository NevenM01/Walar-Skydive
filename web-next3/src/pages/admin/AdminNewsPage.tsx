import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import {
  adminFormControlClassNoMt,
  adminFormHintClass,
  adminFormLabelClass,
  adminPageDescClass,
  adminPrimaryButtonClass,
} from '../../lib/adminFormClasses'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/formatDate'
import { uploadNewsImagesToStorage } from '../../lib/newsImageUpload'
import {
  deleteNewsPostInSupabase,
  insertNewsPostInSupabase,
  updateNewsPostInSupabase,
} from '../../lib/newsFromSupabase'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { getNewsPostsForAdmin } from '../../lib/api'
import type { NewsPostAdmin } from '../../types'
import { Skeleton } from '../../components/ui/Skeleton'

const EXCERPT_SOFT_MAX = 480
const CATEGORY_PRESETS = ['General', 'Rules', 'Events', 'Guide', 'Announcement'] as const
const MAX_IMAGES = 8

type StagedImage = { id: string; file: File; previewUrl: string }

type NewsEditorForm = {
  title: string
  excerpt: string
  body: string
  category: string
  publishedAt: string
  isPublished: boolean
  isHomePriority: boolean
  authorName: string
  imageUrls: string[]
}

function emptyForm(): NewsEditorForm {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return {
    title: '',
    excerpt: '',
    body: '',
    category: 'General',
    publishedAt: `${y}-${m}-${day}`,
    isPublished: true,
    isHomePriority: false,
    authorName: '',
    imageUrls: [],
  }
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export default function AdminNewsPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState<NewsPostAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<NewsEditorForm>(emptyForm)
  const [editorOpen, setEditorOpen] = useState(false)
  const [staged, setStaged] = useState<StagedImage[]>([])
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearStaged = useCallback(() => {
    setStaged((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.previewUrl))
      return []
    })
  }, [])

  const closeEditor = useCallback(() => {
    clearStaged()
    setImageUrlDraft('')
    setEditorOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }, [clearStaged])

  useEffect(() => {
    if (!editorOpen) return
    const t = window.setTimeout(() => titleInputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [editorOpen])

  useEffect(() => {
    if (!editorOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditor()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editorOpen, closeEditor])

  useEffect(() => {
    if (!editorOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editorOpen])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setRows(await getNewsPostsForAdmin())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load news.', 'default')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void load()
  }, [load])

  function openNewPost() {
    clearStaged()
    setImageUrlDraft('')
    setEditingId(null)
    setForm(emptyForm())
    setEditorOpen(true)
  }

  function openEditPost(p: NewsPostAdmin) {
    clearStaged()
    setImageUrlDraft('')
    setEditingId(p.id)
    setForm({
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      category: p.category,
      publishedAt: p.publishedAt.slice(0, 10),
      isPublished: p.isPublished,
      isHomePriority: p.isHomePriority,
      authorName: p.authorName,
      imageUrls: [...p.imageUrls],
    })
    setEditorOpen(true)
  }

  function addStagedFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const room = MAX_IMAGES - form.imageUrls.length - staged.length
    if (room <= 0) {
      showToast(`Maximum ${MAX_IMAGES} images per post.`, 'default')
      return
    }
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (incoming.length === 0) {
      showToast('Choose image files (JPEG, PNG, WebP, GIF).', 'default')
      return
    }
    const take = incoming.slice(0, room)
    setStaged((prev) => {
      const next = take.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      return [...prev, ...next]
    })
    if (incoming.length > room) {
      showToast(`Only ${room} more image(s) fit (max ${MAX_IMAGES}).`, 'default')
    }
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const s = prev.find((x) => x.id === id)
      if (s) URL.revokeObjectURL(s.previewUrl)
      return prev.filter((x) => x.id !== id)
    })
  }

  function addImageUrlFromDraft() {
    const s = imageUrlDraft.trim()
    if (!s) return
    if (!isValidHttpUrl(s)) {
      showToast('Enter a valid http(s) image URL.', 'default')
      return
    }
    if (form.imageUrls.length + staged.length >= MAX_IMAGES) {
      showToast(`Maximum ${MAX_IMAGES} images per post.`, 'default')
      return
    }
    if (form.imageUrls.includes(s)) {
      showToast('That URL is already added.', 'default')
      return
    }
    setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, s] }))
    setImageUrlDraft('')
  }

  function removeImageUrlAt(index: number) {
    setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== index) }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      showToast('Configure Supabase in .env.local.', 'default')
      return
    }
    if (!form.title.trim()) {
      showToast('Title is required.', 'default')
      return
    }
    if (!form.authorName.trim()) {
      showToast('Author name is required.', 'default')
      return
    }
    if (!user?.id) {
      showToast('You must be signed in to save.', 'default')
      return
    }

    const totalSlots = form.imageUrls.length + staged.length
    if (totalSlots > MAX_IMAGES) {
      showToast(`Maximum ${MAX_IMAGES} images per post.`, 'default')
      return
    }

    setSaving(true)
    try {
      let imageUrls = [...form.imageUrls]
      if (staged.length > 0) {
        const files = staged.map((s) => s.file)
        const uploaded = await uploadNewsImagesToStorage(files, user.id)
        imageUrls = [...imageUrls, ...uploaded].slice(0, MAX_IMAGES)
      }

      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        body: form.body,
        category: form.category,
        publishedAt: form.publishedAt,
        isPublished: form.isPublished,
        isHomePriority: form.isHomePriority,
        authorName: form.authorName,
        imageUrls,
      }

      if (editingId) {
        const updated = await updateNewsPostInSupabase(editingId, payload)
        setRows((prev) =>
          prev.map((r) => {
            if (r.id === editingId) return updated
            if (payload.isHomePriority && r.isHomePriority) return { ...r, isHomePriority: false }
            return r
          }),
        )
        showToast('Post updated.', 'success')
      } else {
        const created = await insertNewsPostInSupabase(payload)
        setRows((prev) => {
          const cleared = prev.map((r) =>
            payload.isHomePriority && r.isHomePriority ? { ...r, isHomePriority: false } : r,
          )
          return [created, ...cleared]
        })
        showToast('Post created.', 'success')
      }
      closeEditor()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'default')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!isSupabaseConfigured()) return
    if (!window.confirm('Delete this post?')) return
    setSaving(true)
    try {
      await deleteNewsPostInSupabase(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      if (editingId === id) closeEditor()
      showToast('Post deleted.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'default')
    } finally {
      setSaving(false)
    }
  }

  const supabaseOk = isSupabaseConfigured()
  const excerptLen = form.excerpt.length
  const excerptOverSoft = excerptLen > EXCERPT_SOFT_MAX
  const imageCount = form.imageUrls.length + staged.length
  const imageRoom = MAX_IMAGES - imageCount

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy dark:text-slate-100">News</h1>
      <p className={adminPageDescClass}>
        Posts appear on the public{' '}
        <Link
          to="/news"
          className="font-medium text-walar-teal-dark underline decoration-sky-300/80 hover:no-underline dark:text-sky-400"
        >
          News
        </Link>{' '}
        page. The excerpt is the list summary; full text goes in <span className="font-medium">Article body</span> and
        appears on the post page. First image is the card cover; more images show as a gallery. Uploads use the{' '}
        <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">news-images</code> Storage bucket
        (run the latest migration).
      </p>

      {!supabaseOk && (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          Supabase is not configured — add credentials to{' '}
          <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">.env.local</code> and apply migrations
          for <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/60">walar_news_posts</code> plus
          author/images/storage.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={openNewPost} className={adminPrimaryButtonClass}>
          New post
        </button>
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-walar-navy dark:text-slate-100">All posts</h2>

      {loading ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !supabaseOk ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No data without Supabase.</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No posts yet — click <span className="font-medium text-slate-600 dark:text-slate-300">New post</span>.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-600 dark:border-slate-600 dark:bg-slate-800/90">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-walar-navy dark:text-slate-100">{p.title}</p>
                  {!p.isPublished && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
                      Draft
                    </span>
                  )}
                  {p.isHomePriority && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold uppercase text-sky-900 dark:bg-sky-950/80 dark:text-sky-200">
                      Pinned
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(p.publishedAt)} · {p.category}
                  {p.authorName.trim() ? ` · ${p.authorName.trim()}` : ''}
                  {p.imageUrls.length > 0 ? ` · ${p.imageUrls.length} image(s)` : ''}
                </p>
                {p.excerpt.trim() ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {p.excerpt}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEditPost(p)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-walar-navy hover:bg-sky-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  disabled={saving}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(p.id)}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/50"
                  disabled={saving}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editorOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close dialog"
            onClick={closeEditor}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-editor-title"
            className="relative z-[1] max-h-[min(92vh,820px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-600">
              <h2
                id="news-editor-title"
                className="font-display text-lg font-bold text-walar-navy dark:text-slate-100"
              >
                {editingId ? 'Edit post' : 'New post'}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-5">
              <div>
                <label className={adminFormLabelClass} htmlFor="news-title">
                  Title
                </label>
                <input
                  ref={titleInputRef}
                  id="news-title"
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  disabled={!supabaseOk || saving}
                  required
                  placeholder="Short headline"
                />
              </div>

              <div>
                <label className={adminFormLabelClass} htmlFor="news-author">
                  Author name
                </label>
                <input
                  id="news-author"
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                  value={form.authorName}
                  onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                  disabled={!supabaseOk || saving}
                  required
                  placeholder="Shown on the public News card"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label className={adminFormLabelClass} htmlFor="news-excerpt">
                    Excerpt
                  </label>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      excerptOverSoft
                        ? 'font-medium text-amber-700 dark:text-amber-300'
                        : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {excerptLen} / ~{EXCERPT_SOFT_MAX} recommended for cards
                  </span>
                </div>
                <textarea
                  id="news-excerpt"
                  rows={5}
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5 resize-y')}
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  disabled={!supabaseOk || saving}
                  placeholder="Summary shown on the News page list…"
                />
                {excerptOverSoft ? (
                  <p className={cn(adminFormHintClass, 'mt-1 text-amber-700 dark:text-amber-300')}>
                    Long text still saves; the public card may look dense. Consider trimming for readability.
                  </p>
                ) : null}
              </div>

              <div>
                <label className={adminFormLabelClass} htmlFor="news-body">
                  Article body
                </label>
                <p className={cn(adminFormHintClass, 'mt-0.5')}>
                  Full post text — shown on the public article page. Plain text; line breaks are preserved.
                </p>
                <textarea
                  id="news-body"
                  rows={12}
                  className={cn(adminFormControlClassNoMt(), 'mt-1.5 resize-y font-mono text-sm')}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  disabled={!supabaseOk || saving}
                  placeholder="Write the full article here…"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={adminFormLabelClass}>Images</p>
                  <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {imageCount} / {MAX_IMAGES} — first is cover
                  </span>
                </div>
                <p className={cn(adminFormHintClass, 'mt-1')}>
                  Upload files (stored in Supabase) or paste external image URLs. Order = cover first, then gallery.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  disabled={!supabaseOk || saving || imageRoom <= 0}
                  onChange={(e) => {
                    addStagedFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!supabaseOk || saving || imageRoom <= 0}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Upload images
                  </button>
                </div>

                {(form.imageUrls.length > 0 || staged.length > 0) && (
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {form.imageUrls.map((url, i) => (
                      <li
                        key={`url-${i}-${url.slice(0, 32)}`}
                        className="relative w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600"
                      >
                        <img src={url} alt="" className="aspect-square w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImageUrlAt(i)}
                          disabled={saving}
                          className="absolute right-1 top-1 rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700"
                        >
                          Remove
                        </button>
                        {i === 0 ? (
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                            Cover
                          </span>
                        ) : null}
                      </li>
                    ))}
                    {staged.map((s) => (
                      <li
                        key={s.id}
                        className="relative w-24 shrink-0 overflow-hidden rounded-xl border border-dashed border-sky-400 dark:border-sky-600"
                      >
                        <img src={s.previewUrl} alt="" className="aspect-square w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeStaged(s.id)}
                          disabled={saving}
                          className="absolute right-1 top-1 rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700"
                        >
                          Remove
                        </button>
                        <span className="absolute bottom-1 left-1 rounded bg-sky-700/85 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                          New
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className={adminFormLabelClass} htmlFor="news-image-url">
                      Image URL
                    </label>
                    <input
                      id="news-image-url"
                      type="url"
                      className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                      value={imageUrlDraft}
                      onChange={(e) => setImageUrlDraft(e.target.value)}
                      disabled={!supabaseOk || saving || imageRoom <= 0}
                      placeholder="https://…"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addImageUrlFromDraft}
                    disabled={!supabaseOk || saving || imageRoom <= 0}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:shrink-0"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              <div>
                <p className={adminFormLabelClass}>Category</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORY_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      disabled={!supabaseOk || saving}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                        form.category === c
                          ? 'border-sky-500 bg-sky-100 text-sky-950 shadow-sm dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50/80 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:bg-slate-800',
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="news-category-custom">
                  Custom category
                </label>
                <input
                  id="news-category-custom"
                  className={cn(adminFormControlClassNoMt(), 'mt-3')}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  disabled={!supabaseOk || saving}
                  placeholder="Or type a custom category"
                  list="news-category-datalist"
                />
                <datalist id="news-category-datalist">
                  {CATEGORY_PRESETS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                <div>
                  <label className={adminFormLabelClass} htmlFor="news-date">
                    Published date
                  </label>
                  <input
                    id="news-date"
                    type="date"
                    className={cn(adminFormControlClassNoMt(), 'mt-1.5')}
                    value={form.publishedAt}
                    onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
                    disabled={!supabaseOk || saving}
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Visibility
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isPublished}
                      disabled={!supabaseOk || saving}
                      onClick={() => setForm((f) => ({ ...f, isPublished: !f.isPublished }))}
                      className={cn(
                        'inline-flex h-8 w-14 shrink-0 rounded-full p-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-50',
                        form.isPublished
                          ? 'justify-end bg-sky-600 dark:bg-sky-500'
                          : 'justify-start bg-slate-300 dark:bg-slate-600',
                      )}
                    >
                      <span
                        className="pointer-events-none block h-6 w-6 rounded-full bg-white shadow-md"
                        aria-hidden
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-walar-navy dark:text-slate-100">
                        {form.isPublished ? 'Published' : 'Draft'}
                      </p>
                      <p className={adminFormHintClass}>
                        {form.isPublished ? 'Visible on /news' : 'Hidden until you publish'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/60">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900"
                    checked={form.isHomePriority}
                    onChange={(e) => setForm((f) => ({ ...f, isHomePriority: e.target.checked }))}
                    disabled={!supabaseOk || saving}
                  />
                  <span className="min-w-0">
                    <span className="text-sm font-medium text-walar-navy dark:text-slate-100">
                      Pin on homepage
                    </span>
                    <span className={cn(adminFormHintClass, 'mt-1 block')}>
                      Shown first on the home &ldquo;Latest news&rdquo; strip with the latest other post; only one post
                      can be pinned.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" className={adminPrimaryButtonClass} disabled={!supabaseOk || saving}>
                  {saving ? 'Saving…' : editingId ? 'Update post' : 'Create post'}
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
