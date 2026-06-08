import type { ContractTemplateVariables } from '@/types/contract-templates'

/**
 * Sustituye todas las variables `{{var}}` en el contenido por sus valores reales.
 * Variables no reconocidas se dejan tal cual (visible para que el editor sepa que falta data).
 */
export function renderTemplate(
  content: string,
  variables: Partial<ContractTemplateVariables>,
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key as keyof ContractTemplateVariables]
    if (value === undefined || value === null) return match
    return String(value)
  })
}

/**
 * Datos de muestra para preview del template.
 * Se usan en el dashboard al crear/editar plantillas — el admin ve el resultado renderizado.
 */
export function getSampleVariables(planName: string): ContractTemplateVariables {
  return {
    investor_name: 'Juan Pérez Mora',
    investor_cedula: '1-1234-5678',
    investor_email: 'juan.perez@example.com',
    investor_phone: '+506 8888 8888',
    contract_number: 'A1B2C3D4',
    amount: '$5,000.00',
    amount_raw: 5000,
    term_months: '12',
    annual_rate: '120',
    plan_name: planName,
    start_date: '15 de enero de 2026',
    end_date: '15 de enero de 2027',
    monthly_payment: '$500.00',
    semestral_payment: '$2,250.00',
    beneficiaries_list:
      '1.) María Pérez Mora, número de cédula 1-2345-6789, con el 50% del contrato.\n2.) Carlos Pérez Mora, número de cédula 1-3456-7890, con el 50% del contrato.',
    company_name: 'Grandir CM Sociedad de Responsabilidad Limitada',
    company_cedula: '3-102-873916',
    representative_1_name: 'April Mora Araya',
    representative_1_cedula: '207490461',
    representative_2_name: 'José Leoncio Castro Quesada',
    representative_2_cedula: '207240210',
  }
}

/**
 * Convierte un monto numérico a string formateado USD.
 */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Convierte una fecha ISO a string formateado en español.
 * Ej: '2026-01-15' → '15 de enero de 2026'
 */
export function formatDateLong(isoDate: string | null): string {
  if (!isoDate) return '—'
  const date = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
