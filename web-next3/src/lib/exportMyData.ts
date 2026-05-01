import { getSupabaseBrowserClient } from './supabaseClient'

export async function exportMyData(): Promise<void> {
  const sb = getSupabaseBrowserClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data: res, error } = await sb.functions.invoke('export-my-data', { body: {} })
  if (error) throw new Error(error.message)
  if (res?.error) throw new Error(res.error)

  const payload = res?.data ?? res
  const jsonText = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonText], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `walar-my-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}

