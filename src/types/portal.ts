import type { Database, Json } from './database'

export type ApprovalStatus = Database['public']['Enums']['approval_status']
export type ContractStatus = Database['public']['Enums']['contract_status']
export type ContractInvestorRole = Database['public']['Enums']['contract_investor_role']
export type PlanType = Database['public']['Enums']['plan_type']
export type PaymentType = Database['public']['Enums']['payment_type']
export type DocumentType = Database['public']['Enums']['document_type']

export interface PortalInvestor {
  id: string
  full_name: string
  cedula: string
  phone: string | null
  emails: Array<{ email: string; is_primary: boolean }>
}

export interface PortalContract {
  id: string
  amount: number
  status: ContractStatus
  term_months: number
  start_date: string | null
  end_date: string | null
  version: number
}

export interface PortalPlan {
  id: string
  name: string
  type: PlanType
  annual_rate: number
  payment_structure: Json
}

export interface PortalPayment {
  id: string
  amount: number
  payment_date: string
  type: PaymentType
  notes: string | null
}

export interface PortalDocument {
  id: string
  type: DocumentType
  file_name: string
  storage_path: string
  created_at: string
  mime_type: string | null
  signed_url: string | null
}

export interface PortalReport {
  id: string
  period_start: string
  period_end: string
  growth_rate: number
  calculated_amount: number | null
  pdf_path: string | null
  sent_at: string | null
  status: string
  signed_url: string | null
}

export interface PortalContractInvestor {
  id: string
  role: ContractInvestorRole
  approval_status: ApprovalStatus
  revision_comment: string | null
  approved_at: string | null
  signed_at: string | null
  signature_name: string | null
}

export interface PortalData {
  contractInvestor: PortalContractInvestor
  investor: PortalInvestor | null
  contract: PortalContract
  plan: PortalPlan | null
  payments: PortalPayment[]
  documents: PortalDocument[]
  reports: PortalReport[]
}
