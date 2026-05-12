import { createAdminClient } from '@/lib/supabase/server'
import { PaymentsPageTabs } from './_components/payments-page-tabs'
import type { PaymentListItem, PaymentSummary, ContractOption } from '@/types/payments'

export const metadata = {
  title: 'Pagos | Grandir CM',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default async function PaymentsPage() {
  const supabase = await createAdminClient()

  // Fetch payments with joins
  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select(`
      id, contract_id, amount, type, payment_date, receipt_path,
      verified, verified_at, notes, created_at,
      contract:contracts(
        id,
        plan:investment_plans(name)
      )
    `)
    .order('payment_date', { ascending: false })

  const payments = paymentsRaw ?? []

  // Fetch holders for all contracts
  const contractIds = [...new Set(payments.map((p) => p.contract_id))]

  let holderMap = new Map<string, string>()
  if (contractIds.length > 0) {
    const { data: holdersRaw } = await supabase
      .from('contract_investors')
      .select('contract_id, investor:investors(full_name)')
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    for (const row of holdersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      holderMap.set(row.contract_id, inv?.full_name ?? '—')
    }
  }

  type PaymentRow = (typeof payments)[number]

  const paymentList: PaymentListItem[] = payments.map((p: PaymentRow) => {
    const contract = p.contract as { id: string; plan: { name: string } | null } | null
    return {
      id: p.id,
      contract_id: p.contract_id,
      holder_name: holderMap.get(p.contract_id) ?? '—',
      plan_name: contract?.plan?.name ?? '—',
      amount: p.amount,
      type: p.type,
      payment_date: p.payment_date,
      receipt_path: p.receipt_path,
      verified: p.verified,
      verified_at: p.verified_at,
      notes: p.notes,
      created_at: p.created_at,
    }
  })

  // Summary
  const summary: PaymentSummary = {
    total_deposited: paymentList
      .filter((p) => p.type === 'deposit' && p.verified)
      .reduce((sum, p) => sum + p.amount, 0),
    total_withdrawn: paymentList
      .filter((p) => p.type === 'withdrawal' && p.verified)
      .reduce((sum, p) => sum + p.amount, 0),
    total_commissions: paymentList
      .filter((p) => p.type === 'commission' && p.verified)
      .reduce((sum, p) => sum + p.amount, 0),
    pending_verification: paymentList.filter((p) => !p.verified).length,
  }

  // Fetch active contracts for the form
  const { data: contractsRaw } = await supabase
    .from('contracts')
    .select(`
      id, status,
      plan:investment_plans(name)
    `)
    .in('status', ['active', 'draft', 'pending_approval'])
    .order('created_at', { ascending: false })

  const contractsForForm = contractsRaw ?? []
  const contractHolderIds = contractsForForm.map((c) => c.id)

  let contractHolderMap = new Map<string, string | null>()
  if (contractHolderIds.length > 0) {
    const { data: contractHoldersRaw } = await supabase
      .from('contract_investors')
      .select('contract_id, investor:investors(full_name)')
      .in('contract_id', contractHolderIds)
      .eq('role', 'holder')

    for (const row of contractHoldersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      contractHolderMap.set(row.contract_id, inv?.full_name ?? null)
    }
  }

  type ContractRow = (typeof contractsForForm)[number]

  const contracts: ContractOption[] = contractsForForm.map((c: ContractRow) => {
    const plan = c.plan as { name: string } | null
    return {
      id: c.id,
      holder_name: contractHolderMap.get(c.id) ?? null,
      plan_name: plan?.name ?? '—',
      status: c.status,
    }
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Pagos y depósitos</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Control de depósitos, retiros y comisiones de todos los contratos.
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total depositado */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 sm:p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
            Total depositado
          </p>
          <p className="text-2xl font-semibold text-zinc-900">
            {formatCurrency(summary.total_deposited)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Depósitos verificados</p>
        </div>

        {/* Total retirado */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 sm:p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
            Total retirado
          </p>
          <p className="text-2xl font-semibold text-zinc-900">
            {formatCurrency(summary.total_withdrawn)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Retiros verificados</p>
        </div>

        {/* Pendientes de verificación */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 sm:p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
            Pendientes de verificación
          </p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold text-zinc-900">
              {summary.pending_verification}
            </p>
            {summary.pending_verification > 0 && (
              <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
                Requiere acción
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Pagos sin verificar</p>
        </div>
      </div>

      {/* Tabs: Upcoming vs History */}
      <PaymentsPageTabs initialPayments={paymentList} contracts={contracts} />
    </div>
  )
}
