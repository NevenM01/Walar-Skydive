import { Link } from 'react-router-dom'
import { X } from '@phosphor-icons/react'

type Props = {
  title: string
  description?: string
  children: React.ReactNode
}

/**
 * Two-column auth layout: branded WALAR panel (swappable visuals via CSS vars) + form column.
 */
export function AuthSplitShell({ title, description, children }: Props) {
  return (
    <div className="flex min-h-[min(720px,calc(100dvh-8rem))] items-center justify-center px-4 py-10 sm:px-6">
      <div className="relative w-full max-w-[920px] overflow-hidden rounded-[20px] border border-[var(--border-col)] bg-[var(--surface)] shadow-[0_24px_80px_-24px_rgba(14,58,79,0.25)] dark:shadow-[0_28px_90px_-28px_rgba(0,0,0,0.55)]">
        <Link
          to="/"
          className="absolute right-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--accent-subtle)] hover:text-[var(--text-col)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Close and go home"
        >
          <X size={22} weight="bold" />
        </Link>

        <div className="grid min-h-[480px] grid-cols-1 lg:grid-cols-[42%_58%]">
          {/* Brand column — WALAR theme (tweak gradients / copy here) */}
          <aside className="relative isolate flex flex-col justify-between gap-10 overflow-hidden px-8 py-10 lg:px-10 lg:py-12">
            <div
              className="pointer-events-none absolute inset-0 rounded-b-[20px] lg:rounded-br-none lg:rounded-l-[20px]"
              style={{
                background:
                  'linear-gradient(165deg, color-mix(in srgb, var(--accent-subtle) 92%, white) 0%, color-mix(in srgb, var(--accent) 14%, var(--bg)) 48%, color-mix(in srgb, var(--accent-h) 12%, var(--bg)) 100%)',
              }}
            />
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[var(--accent)] opacity-[0.12] blur-3xl dark:opacity-[0.18]" />
            <div className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-[var(--accent-h)] opacity-[0.1] blur-3xl dark:opacity-[0.14]" />

            <div className="relative space-y-5">
              <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--text-col)_12%,transparent)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-col)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-[var(--text-col)]">
                WALAR
              </span>
              <div>
                <p className="font-display text-3xl font-bold leading-tight tracking-tight text-[var(--text-col)] sm:text-4xl">
                  Accuracy
                  <br />
                  <span className="text-[var(--accent)]">landing</span>
                  <span className="text-[var(--text-col)]">.</span>
                </p>
                <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-[color-mix(in_srgb,var(--text-col)_72%,transparent)] dark:text-[color-mix(in_srgb,var(--text-col)_65%,transparent)]">
                  Official portal for international competitions — live rankings, events, and athlete profiles.
                </p>
              </div>
            </div>

            <p className="relative text-xs font-medium uppercase tracking-widest text-[color-mix(in_srgb,var(--text-col)_45%,transparent)]">
              International ranking
            </p>
          </aside>

          {/* Form column */}
          <div className="relative flex flex-col border-t border-[var(--border-col)] bg-[var(--surface)] px-7 py-10 sm:px-10 sm:py-12 lg:border-l lg:border-t-0">
            <div className="mb-8 pr-10">
              <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-col)]">{title}</h1>
              {description ? (
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">{description}</p>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const authFieldShellClass =
  'relative flex items-center rounded-[14px] border border-[var(--border-col)] bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent-subtle))] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)] dark:bg-[color-mix(in_srgb,var(--surface)_70%,#0f1c2c)]'

export const authInputClass =
  'w-full rounded-[14px] border-0 bg-transparent py-3 pl-11 pr-3.5 text-sm text-[var(--text-col)] outline-none placeholder:text-[var(--muted)] disabled:opacity-55'

export const authInputClassNoLeftIcon =
  'w-full rounded-[14px] border-0 bg-transparent py-3 pl-3.5 pr-3.5 text-sm text-[var(--text-col)] outline-none placeholder:text-[var(--muted)] disabled:opacity-55'

export const authInputClassWithRightIcon = `${authInputClass} pr-11`

export const authInputClassNoLeftIconWithRightIcon = `${authInputClassNoLeftIcon} pr-11`

export const authLabelClass = 'block text-sm font-semibold text-[var(--text-col)]'

export const authPrimaryButtonClass =
  'w-full rounded-[14px] bg-[var(--accent)] px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--accent)_45%,transparent)] transition hover:bg-[var(--accent-h)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-55'

export const authMutedLinkClass =
  'text-sm font-semibold text-amber-700 underline-offset-4 transition hover:underline dark:text-amber-400'

export const authAccentLinkClass =
  'font-semibold text-[var(--accent)] underline underline-offset-4 transition hover:text-[var(--accent-h)]'
