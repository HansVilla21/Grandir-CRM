export interface ContractTemplate {
  id: string
  plan_id: string
  plan_name?: string
  name: string
  version: number
  content: string
  active: boolean
  created_at: string
  updated_at: string
  in_use_count?: number
}

/**
 * Variables disponibles para sustitución `{{var}}` en el contenido de la plantilla.
 * Se sustituyen al renderizar el contrato (al generar el PDF o el preview).
 */
export interface ContractTemplateVariables {
  // Inversionista (contratante)
  investor_name: string
  investor_cedula: string
  investor_email: string
  investor_phone: string

  // Contrato
  contract_number: string
  amount: string
  amount_raw: number
  term_months: string
  annual_rate: string
  plan_name: string
  start_date: string
  end_date: string

  // Plan-específicas (calculadas según el tipo de plan)
  monthly_payment: string
  semestral_payment: string

  // Beneficiarios (texto formateado, ej: "1.) Juan Pérez, número de cédula 1-1234-5678, con el 50% del contrato.")
  beneficiaries_list: string

  // Empresa (estáticas, vienen del cliente)
  company_name: string
  company_cedula: string
  representative_1_name: string
  representative_1_cedula: string
  representative_2_name: string
  representative_2_cedula: string
}

export const AVAILABLE_VARIABLES: Array<{
  key: keyof ContractTemplateVariables
  label: string
  example: string
}> = [
  { key: 'investor_name', label: 'Nombre del inversionista', example: 'Juan Pérez Mora' },
  { key: 'investor_cedula', label: 'Cédula del inversionista', example: '1-1234-5678' },
  { key: 'investor_email', label: 'Email del inversionista', example: 'juan@example.com' },
  { key: 'investor_phone', label: 'Teléfono del inversionista', example: '+506 8888 8888' },
  { key: 'contract_number', label: 'Número de contrato', example: 'AB12CD34' },
  { key: 'amount', label: 'Monto formateado', example: '$5,000.00' },
  { key: 'term_months', label: 'Plazo en meses', example: '12' },
  { key: 'annual_rate', label: 'Rendimiento anual (%)', example: '120' },
  { key: 'plan_name', label: 'Nombre del plan', example: 'Plan Anual' },
  { key: 'start_date', label: 'Fecha de inicio', example: '15 de enero de 2026' },
  { key: 'end_date', label: 'Fecha de vencimiento', example: '15 de enero de 2027' },
  { key: 'monthly_payment', label: 'Pago mensual (solo Mensual)', example: '$500.00' },
  { key: 'semestral_payment', label: 'Pago semestral (solo Semestral)', example: '$2,250.00' },
  { key: 'beneficiaries_list', label: 'Lista de beneficiarios', example: '1.) Juan, cédula 1-1234, 50%' },
  { key: 'company_name', label: 'Razón social', example: 'Grandir CM Sociedad de Responsabilidad Limitada' },
  { key: 'company_cedula', label: 'Cédula jurídica', example: '3-102-873916' },
  { key: 'representative_1_name', label: 'Representante 1', example: 'April Mora Araya' },
  { key: 'representative_1_cedula', label: 'Cédula representante 1', example: '207490461' },
  { key: 'representative_2_name', label: 'Representante 2', example: 'José Leoncio Castro Quesada' },
  { key: 'representative_2_cedula', label: 'Cédula representante 2', example: '207240210' },
]
