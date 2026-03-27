import type { Database } from './database'

export type ContractStatus = Database['public']['Enums']['contract_status']
export type DocumentType = Database['public']['Enums']['document_type']
export type ApprovalStatus = Database['public']['Enums']['approval_status']
export type ContractInvestorRole = Database['public']['Enums']['contract_investor_role']

export interface ContractListItem {
  id: string
  plan_id: string
  plan_name: string
  plan_type: string
  holder_name: string | null
  amount: number
  status: ContractStatus
  term_months: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface ContractInvestorDetail {
  id: string
  contract_id: string
  investor_id: string
  role: ContractInvestorRole
  approval_status: ApprovalStatus
  portal_token: string | null
  token_expires_at: string | null
  revision_comment: string | null
  approved_at: string | null
  created_at: string
  investor: {
    full_name: string
    cedula: string
    emails: { email: string; is_primary: boolean }[]
  } | null
}

export interface ContractDocumentDetail {
  id: string
  contract_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  type: DocumentType
  version: number
  uploaded_by: string | null
  uploaded_by_portal: string | null
  created_at: string
}

export interface ContractPaymentDetail {
  id: string
  contract_id: string
  amount: number
  type: Database['public']['Enums']['payment_type']
  payment_date: string
  verified: boolean
  verified_at: string | null
  receipt_path: string | null
  notes: string | null
  created_at: string
}

export interface ContractReportDetail {
  id: string
  contract_id: string
  period_start: string
  period_end: string
  status: Database['public']['Enums']['report_status']
  sent_at: string | null
  pdf_path: string | null
  growth_rate: number
  calculated_amount: number | null
}

export interface ContractDetail {
  id: string
  plan_id: string
  amount: number
  status: ContractStatus
  term_months: number
  start_date: string | null
  end_date: string | null
  report_frequency_months: number
  version: number
  parent_contract_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  plan: {
    id: string
    name: string
    type: string
    annual_rate: number
    min_amount: number
  } | null
  contract_investors: ContractInvestorDetail[]
  payments: ContractPaymentDetail[]
  contract_documents: ContractDocumentDetail[]
  reports: ContractReportDetail[]
}
