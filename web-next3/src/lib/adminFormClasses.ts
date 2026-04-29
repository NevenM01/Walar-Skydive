import { cn } from './cn'

/** Muted paragraph under admin page titles */
export const adminPageDescClass =
  'mt-1 text-sm text-slate-600 dark:text-slate-400'

/** Label above inputs / selects */
export const adminFormLabelClass =
  'block text-sm font-medium text-slate-700 dark:text-slate-200'

/** Native inputs & selects — readable text and placeholders in dark mode */
export const adminFormControlClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 disabled:opacity-60 dark:border-slate-500 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-sky-500 dark:focus:ring-sky-500/25'

/** Same as adminFormControlClass but without top margin (e.g. grid layouts) */
export function adminFormControlClassNoMt(extra?: string) {
  return cn(
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 disabled:opacity-60 dark:border-slate-500 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-sky-500 dark:focus:ring-sky-500/25',
    extra,
  )
}

/** Primary actions — avoids `bg-walar-navy` which is inverted in dark theme tokens */
export const adminPrimaryButtonClass =
  'rounded-xl bg-[#0c4a6e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#075985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:pointer-events-none disabled:opacity-55 dark:bg-sky-600 dark:hover:bg-sky-500 dark:focus-visible:outline-sky-400'

/** Teal CTA (e.g. Save demo) — explicit so it stays vivid in dark */
export const adminTealButtonClass =
  'rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-55 dark:bg-sky-500 dark:hover:bg-sky-400'

/** Helper / status line under forms */
export const adminFormHintClass = 'text-xs text-slate-500 dark:text-slate-400'
