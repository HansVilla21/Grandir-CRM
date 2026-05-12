import { createClient } from '@/lib/supabase/server'
import { StatsGrid } from './_components/stats-grid'
import { ContractsByStatus } from './_components/contracts-by-status'
import { ExpiringContracts } from './_components/expiring-contracts'
import { PendingPaymentsList } from './_components/pending-payments-list'
import { UpcomingPaymentsWidget } from './_components/upcoming-payments-widget'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

const CONTRACT_STATUS_ORDER = [
  'draft',
  'pending_approval',
  'revision_requested',
  'active',
  'expired',
  'cancelled',
]

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    profileResult,
    capitalResult,
    activeInvestorsResult,
    activeContractsResult,
    pendingPaymentsCountResult,
    allContractsResult,
    expiringContractsResult,
    pendingPaymentsListResult,
  ] = await Promise.all([
    // User profile
    supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user!.id)
      .single(),

    // Capital total activo
    supabase
      .from('contracts')
      .select('amount')
      .eq('status', 'active'),

    // Inversionistas activos
    supabase
      .from('investors')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Contratos activos
    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Pagos pendientes de verificación
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('verified', false),

    // Todos los contratos para agrupar por estado
    supabase
      .from('contracts')
      .select('status'),

    // Contratos próximos a vencer (60 días)
    supabase
      .from('contracts')
      .select(`
        id,
        amount,
        end_date,
        plan:investment_plans(name),
        contract_investors!inner(
          role,
          investor:investors(full_name)
        )
      `)
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .lte(
        'end_date',
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      )
      .eq('contract_investors.role', 'holder')
      .order('end_date', { ascending: true })
      .limit(5),

    // Últimos 5 pagos no verificados
    supabase
      .from('payments')
      .select(`
        id,
        contract_id,
        amount,
        type,
        payment_date,
        created_at,
        contract:contracts(
          contract_investors!inner(
            role,
            investor:investors(full_name)
          )
        )
      `)
      .eq('verified', false)
      .eq('contract.contract_investors.role', 'holder')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const firstName = profileResult.data?.full_name?.split(' ')[0] ?? 'equipo'

  // Capital total
  const capitalTotal = (capitalResult.data ?? []).reduce(
    (sum, c) => sum + (c.amount ?? 0),
    0
  )

  // Stat cards
  const statCards = [
    {
      label: 'Capital activo',
      value: formatCurrency(capitalTotal),
      description: 'Suma de contratos con estado activo',
    },
    {
      label: 'Inversionistas activos',
      value: (activeInvestorsResult.count ?? 0).toString(),
      description: 'Perfiles con estado activo',
    },
    {
      label: 'Contratos activos',
      value: (activeContractsResult.count ?? 0).toString(),
      description: 'Contratos en curso',
    },
    {
      label: 'Pagos sin verificar',
      value: (pendingPaymentsCountResult.count ?? 0).toString(),
      description: 'Requieren revisión',
      alert: (pendingPaymentsCountResult.count ?? 0) > 0,
    },
  ]

  // Contracts by status
  const statusMap = new Map<string, number>()
  for (const { status } of allContractsResult.data ?? []) {
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1)
  }
  const statusCounts = CONTRACT_STATUS_ORDER
    .filter((s) => statusMap.has(s))
    .map((s) => ({ status: s, count: statusMap.get(s)! }))

  // Expiring contracts — flatten holders
  type ExpiringRaw = {
    id: string
    amount: number
    end_date: string | null
    plan: { name: string } | null
    contract_investors: {
      role: string
      investor: { full_name: string } | null
    }[]
  }

  const expiringContracts = (expiringContractsResult.data ?? []).map((raw) => {
    const r = raw as unknown as ExpiringRaw
    const holderEntry = r.contract_investors?.find((ci) => ci.role === 'holder')
    return {
      id: r.id,
      holder_name: holderEntry?.investor?.full_name ?? '—',
      plan_name: r.plan?.name ?? '—',
      amount: r.amount,
      end_date: r.end_date ?? '',
    }
  })

  // Pending payments list — flatten holders
  type PendingPaymentRaw = {
    id: string
    contract_id: string
    amount: number
    type: string
    payment_date: string
    created_at: string
    contract: {
      contract_investors: {
        role: string
        investor: { full_name: string } | null
      }[]
    } | null
  }

  const pendingPayments = (pendingPaymentsListResult.data ?? []).map((raw) => {
    const r = raw as unknown as PendingPaymentRaw
    const holderEntry = r.contract?.contract_investors?.find((ci) => ci.role === 'holder')
    return {
      id: r.id,
      contract_id: r.contract_id,
      holder_name: holderEntry?.investor?.full_name ?? '—',
      amount: r.amount,
      type: r.type,
      payment_date: r.payment_date,
      created_at: r.created_at,
    }
  })

  const today = new Intl.DateTimeFormat('es-CR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 break-words">
          Bienvenido, {firstName}.
        </h1>
        <p className="mt-1 text-sm text-zinc-500 capitalize">{today}</p>
      </div>

      {/* Fila 1: Stat cards */}
      <StatsGrid cards={statCards} />

      {/* Fila 2: Contratos por estado */}
      {statusCounts.length > 0 && (
        <ContractsByStatus statusCounts={statusCounts} />
      )}

      {/* Fila 3: Próximos pagos (widget) */}
      <UpcomingPaymentsWidget />

      {/* Fila 4: Próximos a vencer */}
      <ExpiringContracts contracts={expiringContracts} />

      {/* Fila 4: Pagos pendientes */}
      <PendingPaymentsList payments={pendingPayments} />
    </div>
  )
}
