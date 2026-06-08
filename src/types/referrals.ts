export interface ReferralCommissionItem {
  id: string
  referrer_id: string
  referrer_name: string
  referred_id: string
  referred_name: string
  contract_id: string
  contract_amount: number
  plan_name: string
  amount: number
  paid: boolean
  paid_at: string | null
  receipt_path: string | null
  created_at: string
}

export interface ReferralSummary {
  total_referrers: number
  total_commissions: number
  pending_commissions: number
  paid_commissions: number
}
