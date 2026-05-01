import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { logCookieConsentBestEffort, setCookieConsentAccepted, getCookieConsent } from '../../lib/cookieConsent'

export function CookieBanner() {
  const existing = useMemo(() => getCookieConsent(), [])
  const [visible, setVisible] = useState(() => !existing)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setVisible(!getCookieConsent())
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-3 left-0 right-0 z-[120] px-3 sm:px-4">
      <div className="mx-auto max-w-[90rem]">
        <div className="rounded-2xl border border-[var(--border-col)] bg-[var(--surface)]/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-sm leading-relaxed text-[var(--text-col)]">
            We use essential storage to make this site work (for example, saving your theme preference).{' '}
            <Link to="/cookies" className="text-[var(--accent)] hover:underline">Learn more</Link>{' '}
            or read our{' '}
            <Link to="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setSaving(true)
                setCookieConsentAccepted()
                setVisible(false)
                void logCookieConsentBestEffort().finally(() => setSaving(false))
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold font-display bg-[var(--accent)] text-white hover:bg-[var(--accent-h)] shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {saving ? 'Saving…' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

