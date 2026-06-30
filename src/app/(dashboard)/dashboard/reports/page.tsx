import { createServiceClient } from '@/lib/supabase/server'
import { ReportsTable } from './_components/reports-table'
import { ReportsDueAlert } from './_components/reports-due-alert'
import { BatchReportButton } from './_components/batch-report-button'
import type { ReportListItem, ContractForReportForm } from '@/types/reports'

export const metadata = {
  title: 'Reportes | Grandir CM',
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  )
}

export default async function ReportsPage() {
  const supabase = createServiceClient()

  // Fetch all reports with joins
  const { data: reportsRaw } = await supabase
    .from('reports')
    .select(`
      id,
      contract_id,
      period_start,
      period_end,
      growth_rate,
      calculated_amount,
      status,
      sent_at,
      created_at,
      contracts (
        investment_plans (name)
      )
    `)
    .order('period_end', { ascending: false })

  // Fetch holder names
  const contractIds = [
    ...new Set((reportsRaw ?? []).map((r) => r.contract_id)),
  ]

  const holderMap = new Map<string, string>()

  if (contractIds.length > 0) {
    const { data: holders } = await supabase
      .from('contract_investors')
      .select('contract_id, investors(full_name)')
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    for (const h of holders ?? []) {
      const inv = h.investors as { full_name: string } | null
      if (inv?.full_name) holderMap.set(h.contract_id, inv.full_name)
    }
  }

  type RawReport = NonNullable<typeof reportsRaw>[number]

  const reports: ReportListItem[] = (reportsRaw ?? []).map((r: RawReport) => {
    const contract = r.contracts as {
      investment_plans: { name: string } | null
    } | null
    return {
      id: r.id,
      contract_id: r.contract_id,
      holder_name: holderMap.get(r.contract_id) ?? '—',
      plan_name: contract?.investment_plans?.name ?? '—',
      period_start: r.period_start,
      period_end: r.period_end,
      growth_rate: r.growth_rate,
      calculated_amount: r.calculated_amount,
      status: r.status,
      sent_at: r.sent_at,
      created_at: r.created_at,
    }
  })

  // Stats
  const pendingCount = reports.filter((r) => r.status === 'pending').length
  const generatedCount = reports.filter((r) => r.status === 'generated').length

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sentThisMonth = reports.filter(
    (r) => r.status === 'sent' && r.sent_at && r.sent_at >= firstOfMonth
  ).length

  // Fetch active contracts for the form
  const { data: contractsRaw } = await supabase
    .from('contracts')
    .select('id, amount, plan:investment_plans(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const activeContractIds = (contractsRaw ?? []).map((c) => c.id)
  const contractHolderMap = new Map<string, string>()

  if (activeContractIds.length > 0) {
    const { data: contractHolders } = await supabase
      .from('contract_investors')
      .select('contract_id, investors(full_name)')
      .in('contract_id', activeContractIds)
      .eq('role', 'holder')

    for (const h of contractHolders ?? []) {
      const inv = h.investors as { full_name: string } | null
      if (inv?.full_name) contractHolderMap.set(h.contract_id, inv.full_name)
    }
  }

  type ContractRow = NonNullable<typeof contractsRaw>[number]

  const contracts: ContractForReportForm[] = (contractsRaw ?? []).map(
    (c: ContractRow) => {
      const plan = c.plan as { name: string } | null
      return {
        id: c.id,
        holder_name: contractHolderMap.get(c.id) ?? '—',
        plan_name: plan?.name ?? '—',
        amount: c.amount,
      }
    }
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Reportes periódicos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gestión y envío de reportes a inversionistas
          </p>
        </div>
        <BatchReportButton />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Reportes pendientes" value={pendingCount} />
        <StatCard label="PDF listo (pendiente de envío)" value={generatedCount} />
        <StatCard label="Enviados este mes" value={sentThisMonth} />
      </div>

      {/* Reportes vencidos */}
      <ReportsDueAlert />

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <ReportsTable reports={reports} contracts={contracts} />
      </div>
    </div>
  )
}
