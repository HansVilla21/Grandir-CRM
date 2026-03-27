import type { Database } from './database'

export type PaymentType = Database['public']['Enums']['payment_type']

export interface PaymentListItem {
  id: string
  contract_id: string
  holder_name: string
  plan_name: string
  amount: number
  type: PaymentType
  payment_date: string
  receipt_path: string | null
  verified: boolean
  verified_at: string | null
  notes: string | null
  created_at: string
}

export interface PaymentSummary {
  total_deposited: number
  total_withdrawn: number
  total_commissions: number
  pending_verification: number
}

export interface ContractOption {
  id: string
  holder_name: string | null
  plan_name: string
  status: Database['public']['Enums']['contract_status']
}
