import type { ContractTemplateVariables } from '@/types/contract-templates'
import { formatMoney, formatDateLong } from './render'

interface BuildVariablesInput {
  investor: {
    full_name: string
    cedula: string
    email?: string | null
    phone?: string | null
  }
  contract: {
    id?: string
    amount: number
    term_months: number
    start_date?: string | null
    end_date?: string | null
  }
  plan: {
    name: string
    type: 'annual' | 'monthly' | 'semestral'
    annual_rate: number
  }
  beneficiaries?: Array<{
    full_name: string
    cedula: string
    percentage: number | null
  }>
}

/**
 * Toma los datos reales del contrato + inversionista + plan y devuelve el
 * objeto de variables listo para sustituir en el template del contrato.
 *
 * Cálculos automáticos:
 *  - monthly_payment: 10% del monto (solo aplica a plan monthly)
 *  - semestral_payment: 50% del rendimiento anual proyectado (solo plan semestral)
 *  - end_date: se calcula si no se proporcionó (start_date + term_months)
 *  - beneficiaries_list: se formatea la lista o se deja placeholder
 */
export function buildContractVariables(
  input: BuildVariablesInput,
): ContractTemplateVariables {
  const { investor, contract, plan, beneficiaries } = input

  const contractNumber = contract.id ? contract.id.slice(0, 8).toUpperCase() : 'NUEVO'

  // Compute end date if missing
  let endDateISO = contract.end_date
  if (!endDateISO && contract.start_date) {
    const start = new Date(`${contract.start_date}T12:00:00`)
    if (!isNaN(start.getTime())) {
      start.setMonth(start.getMonth() + contract.term_months)
      endDateISO = start.toISOString().split('T')[0]
    }
  }

  // Monthly payment (10% of amount, only relevant for monthly plan)
  const monthlyPayment = contract.amount * 0.1
  // Semestral payment: half of the annual gain projection
  const semestralPayment = (contract.amount * (plan.annual_rate / 100)) / 2

  // Beneficiaries list formatting
  let beneficiariesList = '(No se han designado beneficiarios para este contrato.)'
  if (beneficiaries && beneficiaries.length > 0) {
    beneficiariesList = beneficiaries
      .map((b, idx) => {
        const pct = b.percentage !== null ? `${b.percentage}%` : 'porcentaje por definir'
        return `${idx + 1}.) ${b.full_name}, número de cédula ${b.cedula}, con el ${pct} del contrato.`
      })
      .join('\n')
  }

  return {
    investor_name: investor.full_name,
    investor_cedula: investor.cedula,
    investor_email: investor.email ?? '—',
    investor_phone: investor.phone ?? '—',

    contract_number: contractNumber,
    amount: formatMoney(contract.amount),
    amount_raw: contract.amount,
    term_months: String(contract.term_months),
    annual_rate: String(plan.annual_rate),
    plan_name: plan.name,
    start_date: formatDateLong(contract.start_date ?? null),
    end_date: formatDateLong(endDateISO ?? null),

    monthly_payment: formatMoney(monthlyPayment),
    semestral_payment: formatMoney(semestralPayment),

    beneficiaries_list: beneficiariesList,

    company_name: 'Grandir CM Sociedad de Responsabilidad Limitada',
    company_cedula: '3-102-873916',
    representative_1_name: 'April Mora Araya',
    representative_1_cedula: '207490461',
    representative_2_name: 'José Leoncio Castro Quesada',
    representative_2_cedula: '207240210',
  }
}
