import { useState, type FormEvent } from 'react'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/cn'
import {
  adminFormHintClass,
  adminFormLabelClass,
  adminPageDescClass,
  adminPrimaryButtonClass,
} from '../../lib/adminFormClasses'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../../lib/supabaseClient'
import { importResultsCsv } from '../../lib/csvImportResults'
import { parseResultsSpreadsheet } from '../../lib/spreadsheetImport'

const fileInputClass = cn(
  'mt-2 block w-full text-sm text-slate-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold',
  'file:bg-sky-100 file:text-slate-800 file:transition hover:file:bg-sky-200',
  'dark:text-slate-200 dark:file:bg-slate-700 dark:file:text-slate-100 dark:hover:file:bg-slate-600',
)

const linkClass =
  'font-semibold text-walar-teal-dark underline decoration-walar-teal/40 hover:decoration-walar-teal-dark dark:text-sky-400'

export default function AdminCsvPage() {
  const { showToast } = useToast()
  const [fileName, setFileName] = useState<string | null>(null)
  const [importRows, setImportRows] = useState<string[][] | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastLog, setLastLog] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      showToast('Configure Supabase in .env.local first.', 'default')
      return
    }
    if (!importRows?.length) {
      showToast('Choose the Excel template or another .xlsx / .csv file.', 'default')
      return
    }

    const client = getSupabaseBrowserClient()
    if (!client) {
      showToast('Supabase client unavailable.', 'default')
      return
    }

    setBusy(true)
    setLastLog(null)
    try {
      const summary = await importResultsCsv(client, importRows)

      const lines = [
        `Processed ${summary.rowsProcessed} row(s), upserted ${summary.rowsUpserted} result(s).`,
        `Recalculated ${summary.competitionsRecalculated.length} competition(s).`,
      ]
      if (summary.competitionsAutoCreated.length) {
        lines.push(
          `Auto-created competition(s) from label(s): ${summary.competitionsAutoCreated.join('; ')} — open Admin → Competitions to set real dates, location, and display name if needed.`,
        )
      }
      if (summary.errors.length) {
        lines.push(`Errors: ${summary.errors.length}`)
        summary.errors.slice(0, 12).forEach((er) => {
          lines.push(`  Row ${er.rowNumber}: ${er.message}`)
        })
        if (summary.errors.length > 12) lines.push('  …')
      }
      setLastLog(lines.join('\n'))

      if (summary.errors.length && summary.rowsUpserted === 0) {
        showToast('Import finished with errors — see details below.', 'default')
      } else if (summary.errors.length) {
        showToast('Import partially succeeded — check errors below.', 'default')
      } else {
        showToast('Import and recalculation completed.', 'success')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.'
      setLastLog(msg)
      showToast(msg, 'default')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-walar-navy dark:text-slate-100">Results import</h1>
      <p className={adminPageDescClass}>
        Import competition results from the Excel template (.xlsx) or a CSV export of that same sheet.
      </p>

      <div className="mt-6 max-w-3xl space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Step 1
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-walar-navy dark:text-slate-100">
                Download the template
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Fill the <strong>Results</strong> sheet (row 1 = headers). Upload the workbook as-is, or export the sheet as CSV from Excel.
              </p>
            </div>
            <a
              href="/walar-results-import.template.xlsx"
              download
              className={cn(
                adminPrimaryButtonClass,
                'inline-flex items-center justify-center whitespace-nowrap text-center',
              )}
            >
              Download Excel template
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            File: <a className={linkClass} href="/walar-results-import.template.xlsx" download> walar-results-import.template.xlsx</a>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 2
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-walar-navy dark:text-slate-100">
            Upload your file
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Accepted formats: <strong>.xlsx</strong> or <strong>.csv</strong>. If you use CSV from Excel on Windows, the app will auto-detect common encodings for Croatian diacritics.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-8 max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]"
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <label className={adminFormLabelClass}>
            CSV or Excel file
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              className={fileInputClass}
              onChange={(e) => {
                const f = e.target.files?.[0]
                setFileName(f?.name ?? null)
                setImportRows(null)
                setLastLog(null)
                if (!f) return
                void parseResultsSpreadsheet(f)
                  .then((rows) => setImportRows(rows))
                  .catch(() => {
                    setImportRows(null)
                    showToast('Could not read that file. Use .csv or .xlsx (Excel 2007+).', 'default')
                  })
              }}
            />
          </label>
          {fileName && <p className={adminFormHintClass}>Selected: {fileName}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 3
          </p>
          <h3 className="mt-1 font-display text-base font-bold text-walar-navy dark:text-slate-100">
            Import & recalculate
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            After import, WALAR points are recalculated for affected competitions via{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">walar_admin_recalculate_competition</code>.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="submit" disabled={busy || !importRows?.length} className={adminPrimaryButtonClass}>
              {busy ? 'Importing…' : 'Import & recalculate'}
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {importRows?.length ? (
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  File parsed — ready to import.
                </span>
              ) : (
                <span>Choose a file to enable import.</span>
              )}
            </div>
          </div>
        </div>

        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          <summary className="cursor-pointer select-none font-semibold text-walar-navy dark:text-slate-100">
            Column requirements (advanced)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Required</p>
              <ul className="mt-1 list-inside list-disc">
                <li>
                  <code>competition_unique_label</code> (or template <em>Competition label</em>) or <code>competition_id</code> (UUID)
                </li>
                <li>
                  Template <em>First name</em> + <em>Last name</em> (or a single <code>athlete_display_name</code>)
                </li>
                <li>
                  <code>country_code</code>, <code>gender</code> (M/F), <code>gdpr_consent_given</code> (true/false)
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Optional</p>
              <p className="mt-1">
                Competition metadata: <code>competition_display_name</code>, <code>competition_location</code>, dates,{' '}
                <code>competition_rang_code</code>, <code>competition_finished_jump_rounds</code> (completed jump rounds — used
                for organizer strength OP). Athlete: <code>date_of_birth</code>, <code>gdpr_publish_full_name</code>,{' '}
                <code>member_national_team</code>, <code>age_category</code>, <code>wpc_medalist</code>,{' '}
                <code>start_number</code>, <code>team</code>, <code>jump1_cm</code>…<code>jump8_cm</code>, <code>sf_cm</code>,{' '}
                <code>f_cm</code>, optional <code>tb1_cm</code>…<code>tb6_cm</code> (tie-break record only; not summed into
                WALAR score), plus place fields.
              </p>
            </div>
          </div>
        </details>
      </form>

      {lastLog && (
        <pre
          className="mt-6 max-w-2xl overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
          aria-live="polite"
        >
          {lastLog}
        </pre>
      )}
    </div>
  )
}
