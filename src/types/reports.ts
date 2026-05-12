export type ReportStatus = 'pending' | 'generated' | 'sent'

export interface ReportListItem {
  id: string
  contract_id: string
  holder_name: string
  plan_name: string
  period_start: string
  period_end: string
  growth_rate: number
  calculated_amount: number | null
  status: ReportStatus
  sent_at: string | null
  created_at: string
}

export interface ReportDetail {
  id: string
  contract_id: string
  period_start: string
  period_end: string
  growth_rate: number
  calculated_amount: number | null
  description: string | null
  pdf_path: string | null
  status: ReportStatus
  sent_at: string | null
  sent_to: string[] | null
  created_at: string
  updated_at: string
  // joined
  holder_name: string
  plan_name: string
  contract_amount: number
  recipient_emails: string[]
}

export interface ContractForReportForm {
  id: string
  holder_name: string
  plan_name: string
  amount: number
}
