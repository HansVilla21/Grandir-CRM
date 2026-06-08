export interface SignatureData {
  signature_name: string
  signature_cedula: string
  signature_ip: string
  signature_user_agent: string
  signed_at: string
}

export interface VerificationCode {
  id: string
  contract_investor_id: string
  code: string
  expires_at: string
  attempts: number
  used: boolean
  created_at: string
}

export interface ContractTemplate {
  id: string
  plan_id: string
  name: string
  version: number
  content: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface ContractPdfData {
  investor_name: string
  investor_cedula: string
  amount: number
  term_months: number
  start_date: string
  end_date: string | null
  annual_rate: number
  plan_name: string
  plan_type: string
  contract_id: string
}

export interface SignatureCertificateData {
  signer_name: string
  signer_cedula: string
  signed_at: string
  ip_address: string
  document_hash: string
  /**
   * Datos opcionales de la firma del admin (Grandir). Cuando existe, el
   * certificado de firma se renderiza con AMBAS firmas (inversionista + admin)
   * para cumplir con Ley 8454 (ambas partes con mismo método de firma).
   */
  admin_signer?: {
    name: string
    signed_at: string
    ip_address: string
  } | null
}

export type SigningStep = 'identity' | 'verification' | 'confirmation' | 'success'
