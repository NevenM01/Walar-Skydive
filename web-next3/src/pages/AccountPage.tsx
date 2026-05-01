import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Camera, CheckCircle, Trash, WarningCircle } from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import type { Athlete } from '../types'
import { clearAthleteAvatarStorageForUser, uploadAthleteAvatarToStorage } from '../lib/athleteAvatarUpload'
import { fetchAvatarSignedUrl } from '../lib/avatarSignedUrl'
import { fetchMyAthleteFromSupabase, updateMyAthleteProfileInSupabase } from '../lib/athletesFromSupabase'
import { exportMyData } from '../lib/exportMyData'
import { deleteMyAccount } from '../lib/deleteMyAccount'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/shared/ErrorMessage'

type FormState = {
  bio: string
  club: string
  websiteUrl: string
  instagramUrl: string
  facebookUrl: string
}

function normalizeOptional(value: string): string | null {
  const v = value.trim()
  return v.length ? v : null
}

function isValidHttpUrl(raw: string): boolean {
  const v = raw.trim()
  if (!v) return true
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [approvedAvatarSignedUrl, setApprovedAvatarSignedUrl] = useState<string | null>(null)
  const [pendingAvatarSignedUrl, setPendingAvatarSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>({
    bio: '',
    club: '',
    websiteUrl: '',
    instagramUrl: '',
    facebookUrl: '',
  })

  const urlErrors = useMemo(() => {
    const e: Partial<Record<keyof Pick<FormState, 'websiteUrl' | 'instagramUrl' | 'facebookUrl'>, string>> = {}
    if (!isValidHttpUrl(form.websiteUrl)) e.websiteUrl = 'Enter a valid URL starting with http:// or https://'
    if (!isValidHttpUrl(form.instagramUrl)) e.instagramUrl = 'Enter a valid URL starting with http:// or https://'
    if (!isValidHttpUrl(form.facebookUrl)) e.facebookUrl = 'Enter a valid URL starting with http:// or https://'
    return e
  }, [form.websiteUrl, form.instagramUrl, form.facebookUrl])

  const canSave = Object.keys(urlErrors).length === 0 && form.bio.length <= 400

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setLoading(false)
      setAthlete(null)
      setApprovedAvatarSignedUrl(null)
      setPendingAvatarSignedUrl(null)
      return
    }
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const a = await fetchMyAthleteFromSupabase(user.id)
        setAthlete(a)
        setApprovedAvatarSignedUrl(null)
        setPendingAvatarSignedUrl(null)
        setForm({
          bio: a?.bio ?? '',
          club: a?.club ?? '',
          websiteUrl: a?.websiteUrl ?? '',
          instagramUrl: a?.instagramUrl ?? '',
          facebookUrl: a?.facebookUrl ?? '',
        })

        if (a?.id) {
          if (a.avatarPath) {
            fetchAvatarSignedUrl({ athleteId: a.id, kind: 'approved' })
              .then(setApprovedAvatarSignedUrl)
              .catch(() => {})
          }
          if (a.pendingAvatarPath) {
            fetchAvatarSignedUrl({ athleteId: a.id, kind: 'pending' })
              .then(setPendingAvatarSignedUrl)
              .catch(() => {})
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load profile.')
      } finally {
        setLoading(false)
      }
    })()
  }, [authLoading, user?.id])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(null)
    if (!athlete) return
    if (!canSave) return

    setSaving(true)
    try {
      const updated = await updateMyAthleteProfileInSupabase(athlete.id, {
        bio: normalizeOptional(form.bio),
        club: normalizeOptional(form.club),
        websiteUrl: normalizeOptional(form.websiteUrl),
        instagramUrl: normalizeOptional(form.instagramUrl),
        facebookUrl: normalizeOptional(form.facebookUrl),
      })
      setAthlete(updated)
      setSaveSuccess('Saved.')
      window.setTimeout(() => setSaveSuccess(null), 2500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function onAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id || !athlete) return
    setSaveError(null)
    setSaveSuccess(null)
    setAvatarUploading(true)
    try {
      const path = await uploadAthleteAvatarToStorage(file, user.id)
      const updated = await updateMyAthleteProfileInSupabase(athlete.id, { pendingAvatarPath: path })
      setAthlete(updated)
      setPendingAvatarSignedUrl(
        await fetchAvatarSignedUrl({ athleteId: athlete.id, kind: 'pending' }),
      )
      setSaveSuccess('Photo submitted for approval.')
      window.setTimeout(() => setSaveSuccess(null), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to upload photo.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function onRemoveAvatar() {
    if (!user?.id || !athlete?.pendingAvatarPath) return
    setSaveError(null)
    setSaveSuccess(null)
    setAvatarUploading(true)
    try {
      await clearAthleteAvatarStorageForUser(user.id)
      const updated = await updateMyAthleteProfileInSupabase(athlete.id, { pendingAvatarPath: null })
      setAthlete(updated)
      setPendingAvatarSignedUrl(null)
      setSaveSuccess('Submission cancelled.')
      window.setTimeout(() => setSaveSuccess(null), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to remove photo.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const avatarInitials = athlete
    ? athlete.displayName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : ''

  return (
    <div className="max-w-[70rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter text-[var(--text-col)]">
            My profile
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Update your profile photo, bio, and links. Changes show on your public athlete page.
          </p>
        </div>
        {athlete ? (
          <Link
            to={`/athlete/${athlete.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-col)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-col)] hover:bg-[var(--accent-subtle)] transition"
          >
            View public profile →
          </Link>
        ) : null}
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      {loading ? (
        <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-11 w-40" />
        </div>
      ) : !user ? (
        <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6">
          <p className="text-sm text-[var(--muted)]">Please log in to access your profile.</p>
        </div>
      ) : !athlete ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <WarningCircle size={22} weight="fill" className="text-amber-800 dark:text-amber-200 mt-0.5" />
            <div>
              <p className="font-display font-bold text-amber-950 dark:text-amber-100">
                Account not linked to an athlete profile yet
              </p>
              <p className="mt-1 text-sm text-amber-900/85 dark:text-amber-200/90">
                Contact an admin to link your account to an athlete row (set <code className="font-mono">athletes.user_id</code>).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
                <div className="relative shrink-0">
                  {pendingAvatarSignedUrl || approvedAvatarSignedUrl ? (
                    <img
                      src={pendingAvatarSignedUrl || approvedAvatarSignedUrl || ''}
                      alt=""
                      className="w-24 h-24 rounded-2xl object-cover border border-[var(--border-col)] bg-[var(--bg)]"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border border-[var(--border-col)] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                      <span className="font-display font-black text-xl text-[var(--muted)]">{avatarInitials}</span>
                    </div>
                  )}
                  {avatarUploading ? (
                    <div className="absolute inset-0 rounded-2xl bg-[var(--bg)]/80 flex items-center justify-center text-xs font-medium text-[var(--muted)]">
                      …
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)]">Athlete</p>
                  <p className="mt-1 font-display font-black text-2xl tracking-tight text-[var(--text-col)]">
                    {athlete.displayName}
                  </p>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    aria-label="Upload profile photo"
                    disabled={saving || avatarUploading}
                    onChange={(ev) => void onAvatarFileChange(ev)}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={saving || avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-col)] hover:bg-[var(--accent-subtle)] transition disabled:opacity-50"
                    >
                      <Camera size={18} weight="bold" />
                      {approvedAvatarSignedUrl || pendingAvatarSignedUrl ? 'Change photo' : 'Upload photo'}
                    </button>
                    {athlete.pendingAvatarPath ? (
                      <button
                        type="button"
                        disabled={saving || avatarUploading}
                        onClick={() => void onRemoveAvatar()}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 dark:border-rose-900/50 px-3 py-2 text-sm font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                      >
                        <Trash size={18} weight="bold" />
                        Cancel submission
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    JPEG, PNG, WebP or GIF · max 3 MB
                    {athlete.pendingAvatarPath ? ' · Waiting for approval' : ''}
                  </p>
                </div>
              </div>
              {saveSuccess ? (
                <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100 shrink-0">
                  <CheckCircle size={18} weight="fill" />
                  {saveSuccess}
                </p>
              ) : null}
            </div>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-col)]">Bio</span>
            <span className="ml-2 text-xs text-[var(--muted)] tabular">{form.bio.length}/400</span>
            <textarea
              value={form.bio}
              maxLength={400}
              onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-col)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
              placeholder="A short public bio…"
              disabled={saving}
            />
          </label>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--text-col)]">Club</span>
              <input
                value={form.club}
                onChange={(e) => setForm(f => ({ ...f, club: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-col)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                placeholder="e.g. Skydive Zadar"
                disabled={saving}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[var(--text-col)]">Website</span>
              <input
                value={form.websiteUrl}
                onChange={(e) => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-col)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                placeholder="https://example.com"
                disabled={saving}
              />
              {urlErrors.websiteUrl ? <p className="mt-1 text-xs text-rose-600">{urlErrors.websiteUrl}</p> : null}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[var(--text-col)]">Instagram</span>
              <input
                value={form.instagramUrl}
                onChange={(e) => setForm(f => ({ ...f, instagramUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-col)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                placeholder="https://instagram.com/…"
                disabled={saving}
              />
              {urlErrors.instagramUrl ? <p className="mt-1 text-xs text-rose-600">{urlErrors.instagramUrl}</p> : null}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[var(--text-col)]">Facebook</span>
              <input
                value={form.facebookUrl}
                onChange={(e) => setForm(f => ({ ...f, facebookUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-[var(--border-col)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-col)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                placeholder="https://facebook.com/…"
                disabled={saving}
              />
              {urlErrors.facebookUrl ? <p className="mt-1 text-xs text-rose-600">{urlErrors.facebookUrl}</p> : null}
            </label>
          </div>

          {saveError ? (
            <p className="mt-5 rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
              {saveError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <button
              type="submit"
              disabled={saving || !canSave}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-h)] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {!canSave ? (
              <p className="text-xs text-[var(--muted)]">Fix validation errors to save.</p>
            ) : null}
          </div>
          </form>

          <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 md:p-8">
            <h2 className="font-display font-bold text-xl tracking-tight text-[var(--text-col)]">Privacy &amp; data</h2>
            <p className="mt-2 text-sm text-[var(--muted)] max-w-[85ch]">
              You can request a copy of your personal data in JSON format.
            </p>
            <div className="mt-4">
              <button
                type="button"
                disabled={exporting}
                onClick={() => {
                  setExporting(true)
                  void exportMyData()
                    .catch((e) => setSaveError(e instanceof Error ? e.message : 'Export failed.'))
                    .finally(() => setExporting(false))
                }}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border-col)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-col)] hover:bg-[var(--accent-subtle)] transition disabled:opacity-60"
              >
                {exporting ? 'Preparing export…' : 'Export my data'}
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-rose-200/70 bg-rose-50/60 p-4 dark:border-rose-900/45 dark:bg-rose-950/25">
              <p className="text-sm font-semibold text-rose-950 dark:text-rose-100">Delete my account</p>
              <p className="mt-1 text-xs text-rose-900/80 dark:text-rose-200/90 leading-relaxed max-w-[85ch]">
                This will delete your login account, remove your avatar files, and unlink your athlete profile from your account. Ranking results
                remain intact.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    if (!window.confirm('Delete your account? This cannot be undone.')) return
                    if (!window.confirm('Are you absolutely sure?')) return
                    setDeleting(true)
                    void deleteMyAccount()
                      .then(() => window.location.assign('/'))
                      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Delete failed.'))
                      .finally(() => setDeleting(false))
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

