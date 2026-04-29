const enFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  return enFormatter.format(new Date(iso))
}

export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start)
  return `${formatDate(start)} – ${formatDate(end)}`
}
