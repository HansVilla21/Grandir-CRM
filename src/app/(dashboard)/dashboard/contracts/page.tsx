import { createAdminClient } from '@/lib/supabase/server'
import { ContractsTable } from './_components/contracts-table'
import type { ContractListItem } from '@/types/contracts'

export const metadata = {
  title: 'Contratos | Grandir CM',
}

export default async function ContractsPage() {
  const supabase = await createAdminClient()

  // Fetch contracts with plan info
  const { data: contractsRaw, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      id, amount, plan_id, status, source, term_months, start_date, end_date, created_at,
      plan:investment_plans(id, name, type)
    `)
    .order('created_at', { ascending: false })

  if (contractsError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Error al cargar contratos: {contractsError.message}
        </div>
      </div>
    )
  }

  const contracts = contractsRaw ?? []

  // Fetch all holders in one query
  const contractIds = contracts.map((c) => c.id)
  let holderMap = new Map<string, string | null>()

  if (contractIds.length > 0) {
    const { data: holdersRaw } = await supabase
      .from('contract_investors')
      .select(`contract_id, investor:investors(full_name)`)
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    for (const row of holdersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      holderMap.set(row.contract_id, inv?.full_name ?? null)
    }
  }

  const contractList: ContractListItem[] = contracts.map((c) => {
    const plan = c.plan as { id: string; name: string; type: string } | null
    return {
      id: c.id,
      plan_id: c.plan_id,
      plan_name: plan?.name ?? '',
      plan_type: plan?.type ?? '',
      holder_name: holderMap.get(c.id) ?? null,
      amount: c.amount,
      status: c.status,
      source: c.source,
      term_months: c.term_months,
      start_date: c.start_date,
      end_date: c.end_date,
      created_at: c.created_at,
    }
  })

  // Fetch active plans for filter
  const { data: plansRaw } = await supabase
    .from('investment_plans')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true })

  const plans = (plansRaw ?? []).map((p) => ({ id: p.id, name: p.name }))

  return (
    <div className="max-w-7xl mx-auto">
      <ContractsTable contracts={contractList} plans={plans} />
    </div>
  )
}
