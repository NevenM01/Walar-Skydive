/**
 * Visual parity with social login row; OAuth is not wired in this app — buttons are inert with explanation.
 */
export function AuthSocialDivider() {
  return (
    <div className="mt-8 space-y-4">
      <div className="relative flex items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--border-col)]" aria-hidden />
        <span className="relative bg-[var(--surface)] px-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Or continue with
        </span>
      </div>
      <div className="flex justify-center gap-3">
        <span
          title="Enable Google in Supabase Auth to use this."
          className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--border-col)] bg-[var(--surface)] text-[var(--muted)] opacity-60"
          aria-hidden
        >
          <GoogleGlyph className="size-[18px]" />
        </span>
        <span
          title="Enable Facebook in Supabase Auth to use this."
          className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--border-col)] bg-[var(--surface)] text-[var(--muted)] opacity-60"
          aria-hidden
        >
          <FacebookGlyph className="size-[18px]" />
        </span>
        <span
          title="Enable Apple in Supabase Auth to use this."
          className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--border-col)] bg-[var(--surface)] text-[var(--muted)] opacity-60"
          aria-hidden
        >
          <AppleGlyph className="size-[18px]" />
        </span>
      </div>
      <p className="text-center text-[11px] leading-snug text-[var(--muted)]">
        Social providers are visual only here; connect them in Supabase when you need them.
      </p>
    </div>
  )
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.25 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3.3 14.6 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1-.2-1.4H12z"
      />
      <path fill="#4285F4" d="M3.5 7.1l3.3 2.4C7.6 7.5 9.6 5.8 12 5.8c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3.3 14.6 2.2 12 2.2 8.1 2.2 4.7 4.2 3.5 7.1z" />
      <path fill="#FBBC05" d="M12 22.2c2.5 0 4.6-.8 6.1-2.2l-2.8-2.2c-.8.5-1.8.9-3.3.9-3.2 0-5.9-2.2-6.9-5.1l-3.3 2.5c1.9 3.8 5.8 6.1 10.2 6.1z" />
      <path fill="#34A853" d="M21.8 12.2c0-.8-.1-1.5-.3-2.2H12v4.3h5.5c-.2 1.3-1.2 3.3-3.5 4.7l2.8 2.2c1.6-1.5 3-3.8 3-8.9z" />
    </svg>
  )
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.6-4 3.9-4 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"
      />
    </svg>
  )
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M16.4 3.2c.9 1.1 1.4 2.5 1.2 3.9-1.2-.1-2.4-.7-3.2-1.7-.8-1-1.3-2.4-1.1-3.8 1.3 0 2.4.6 3.1 1.6zm1.5 12.6c0 3 1.6 4.5 1.6 4.5s-1 2.7-2.9 4.2c-1.1.9-2.2 1.7-3.6 1.7s-2-.6-3.7-.6-2.5.6-3.7.7c-1.5.1-2.6-.8-3.7-1.7-2.1-1.6-3.7-4.6-3.7-9.1 0-4 2.6-6.1 5.2-6.1 1.3 0 2.4.5 3.2.5s1.9-.6 3.8-.6c1.4 0 2.8.5 3.8 1.5-3.4 1.9-2.8 6.8.7 8.5z"
      />
    </svg>
  )
}
