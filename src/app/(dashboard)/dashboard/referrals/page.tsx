import { createClient } from '@/lib/supabase/server'
import { ReferralsTable } from './_components/referrals-table'
import type { ReferralCommissionItem, ReferralSummary } from '@/types/referrals'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default async function ReferralsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('referral_commissions')
    .select(`
      id,
      referrer_id,
      referred_id,
      contract_id,
      amount,
      paid,
      paid_at,
      created_at,
      referrer:investors!referral_commissions_referrer_id_fkey(full_name),
      referred:investors!referral_commissions_referred_id_fkey(full_name),
      contract:contracts(
        amount,
        plan:investment_plans(name)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-sm text-red-600">Error al cargar comisiones: {error.message}</p>
      </div>
    )
  }

  const rows = data ?? []

  const commissions: ReferralCommissionItem[] = rows.map((row) => {
    const referrer = row.referrer as { full_name: string } | null
    const referred = row.referred as { full_name: string } | null
    const contract = row.contract as {
      amount: number
      plan: { name: string } | null
    } | null

    return {
      id: row.id,
      referrer_id: row.referrer_id,
      referrer_name: referrer?.full_name ?? '—',
      referred_id: row.referred_id,
      referred_name: referred?.full_name ?? '—',
      contract_id: row.contract_id,
      contract_amount: contract?.amount ?? 0,
      plan_name: contract?.plan?.name ?? '—',
      amount: row.amount,
      paid: row.paid,
      paid_at: row.paid_at,
      created_at: row.created_at,
    }
  })

  const referrerIds = new Set(commissions.map((c) => c.referrer_id))
  const summary: ReferralSummary = {
    total_referrers: referrerIds.size,
    total_commissions: commissions.reduce((sum, c) => sum + c.amount, 0),
    pending_commissions: commissions
      .filter((c) => !c.paid)
      .reduce((sum, c) => sum + c.amount, 0),
    paid_commissions: commissions
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + c.amount, 0),
  }

  const summaryCards = [
    {
      label: 'Total de referidores',
      value: summary.total_referrers.toString(),
      description: 'Inversionistas que han referido a alguien',
      highlight: false,
    },
    {
      label: 'Total comisiones generadas',
      value: formatCurrency(summary.total_commissions),
      description: 'Suma acumulada de todas las comisiones',
      highlight: false,
    },
    {
      label: 'Comisiones pendientes',
      value: formatCurrency(summary.pending_commissions),
      description: 'Sin pagar',
      highlight: summary.pending_commissions > 0,
    },
    {
      label: 'Comisiones pagadas',
      value: formatCurrency(summary.paid_commissions),
      description: 'Pagadas al referidor',
      highlight: false,
    },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900">Referidos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Comisiones por referidos de inversionistas.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5"
          >
            <p className="text-sm font-medium text-zinc-500">{card.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                card.highlight ? 'text-yellow-600' : 'text-zinc-900'
              }`}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Table section */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Comisiones</h2>
        </div>
        <div className="px-6 py-4">
          <ReferralsTable commissions={commissions} />
        </div>
      </div>
    </div>
  )
}
