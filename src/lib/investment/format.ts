/** Auto-format cédula as X-XXXX-XXXX (formato Costa Rica, max 9 dígitos) */
export function formatCedula(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 1) return digits
  if (digits.length <= 5) return `${digits[0]}-${digits.slice(1)}`
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5)}`
}

/** Strip all non-digits from cedula */
export function normalizeCedula(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Format amount as USD currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Format date as Costa Rican long date */
export function formatLongDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}
