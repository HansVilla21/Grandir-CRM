import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  computeUpcomingPayments,
  summarizeUpcomingPayments,
  type ContractForSchedule,
  type RegisteredPayment,
} from '@/lib/investment/upcoming-payments'

export async function GET() {
  try {
    const supabase = await createAdminClient()

    // 1. Active contracts with plan info
    const { data: contractsRaw, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id, amount, term_months, start_date, end_date,
        investment_plans (id, name, type, annual_rate)
      `)
      .eq('status', 'active')

    if (contractsError) {
      return NextResponse.json({ error: contractsError.message }, { status: 500 })
    }

    if (!contractsRaw || contractsRaw.length === 0) {
      return NextResponse.json({ items: [], summary: emptySummary() })
    }

    const contractIds = contractsRaw.map((c) => c.id)

    // 2. Holders for these contracts
    const { data: holdersRaw } = await supabase
      .from('contract_investors')
      .select(`
        contract_id,
        investor:investors(id, full_name, emails:investor_emails(email, is_primary))
      `)
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    const holderMap = new Map<
      string,
      { name: string | null; email: string | null }
    >()
    for (const row of holdersRaw ?? []) {
      const investor = row.investor as {
        full_name?: string
        emails?: { email: string; is_primary: boolean }[]
      } | null
      const primaryEmail =
        investor?.emails?.find((e) => e.is_primary)?.email ??
        investor?.emails?.[0]?.email ??
        null
      holderMap.set(row.contract_id, {
        name: investor?.full_name ?? null,
        email: primaryEmail,
      })
    }

    // 3. Withdrawal payments for these contracts
    const { data: paymentsRaw } = await supabase
      .from('payments')
      .select('contract_id, amount, payment_date, type')
      .in('contract_id', contractIds)

    // 4. Build inputs for the calculator
    const contracts: ContractForSchedule[] = contractsRaw
      .map((c) => {
        const plan = c.investment_plans as {
          name: string
          type: string
          annual_rate: number
        } | null
        if (!plan) return null
        const holder = holderMap.get(c.id)
        return {
          id: c.id,
          amount: c.amount,
          term_months: c.term_months,
          start_date: c.start_date,
          end_date: c.end_date,
          plan_type: plan.type as ContractForSchedule['plan_type'],
          annual_rate: plan.annual_rate,
          plan_name: plan.name,
          holder_name: holder?.name ?? null,
          holder_email: holder?.email ?? null,
        }
      })
      .filter((c): c is ContractForSchedule => c !== null)

    const payments: RegisteredPayment[] = (paymentsRaw ?? []).map((p) => ({
      contract_id: p.contract_id,
      amount: p.amount,
      payment_date: p.payment_date,
      type: p.type as RegisteredPayment['type'],
    }))

    // 5. Compute
    const items = computeUpcomingPayments(contracts, payments)
    const summary = summarizeUpcomingPayments(items)

    return NextResponse.json({ items, summary })
  } catch (err) {
    console.error('[upcoming-payments] Error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

function emptySummary() {
  return {
    overdue: 0,
    thisMonth: 0,
    upcoming: 0,
    paid: 0,
    pendingAmount: 0,
    thisMonthAmount: 0,
  }
}
