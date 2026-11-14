export function toMonthInput(value: string): string {
  const match = value.trim().match(/^(\d{4})[.-](\d{2})(?:[.-]\d{2})?$/)
  if (!match) return ''
  const month = Number(match[2])
  if (month < 1 || month > 12) return ''
  return `${match[1]}-${match[2]}`
}

export function isOngoing(value: string): boolean {
  return value.trim() === '至今'
}

export function formatResumePeriod(start: string, end: string): string {
  const show = (value: string) => {
    if (!value || value === '至今') return value
    const month = toMonthInput(value)
    return month ? month.replace('-', '.') : value
  }
  return [show(start), show(end)].filter(Boolean).join(' - ')
}
