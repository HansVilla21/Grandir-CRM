import type { Tables, Enums } from './database'

export type Investor = Tables<'investors'>
export type InvestorEmail = Tables<'investor_emails'>
export type InvestorStatus = Enums<'investor_status'>

/** Investor row with flattened primary email — returned by GET /api/investors */
export interface InvestorWithEmail extends Investor {
  primary_email: string | null
}

/** Full investor detail — returned by GET /api/investors/[id] */
export interface InvestorDetail extends Investor {
  emails: InvestorEmail[]
  referrer: { id: string; full_name: string } | null
}

/** Contract linked to an investor — from contract_investors join */
export interface LinkedContract {
  id: string
  role: Enums<'contract_investor_role'>
  approval_status: Enums<'approval_status'>
  contracts: {
    id: string
    amount: number
    status: Enums<'contract_status'>
    start_date: string | null
    end_date: string | null
    term_months: number
    plan: {
      id: string
      name: string
      type: Enums<'plan_type'>
    } | null
  } | null
}
