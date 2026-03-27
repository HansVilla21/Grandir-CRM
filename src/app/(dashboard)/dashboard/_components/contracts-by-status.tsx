const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente aprobación',
  revision_requested: 'Revisión solicitada',
  active: 'Activo',
  expired: 'Vencido',
  cancelled: 'Cancelado',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  pending_approval: 'bg-blue-50 text-blue-700 border-blue-200',
  revision_requested: 'bg-orange-50 text-orange-700 border-orange-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  expired: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

interface ContractsByStatusProps {
  statusCounts: { status: string; count: number }[]
}

export function ContractsByStatus({ statusCounts }: ContractsByStatusProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
      <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">Contratos por estado</h2>
      </div>
      <div className="px-4 sm:px-6 py-4">
        <div className="flex flex-wrap gap-3">
          {statusCounts.map(({ status, count }) => (
            <div
              key={status}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border min-w-0 ${
                STATUS_STYLES[status] ?? 'bg-zinc-50 text-zinc-600 border-zinc-200'
              }`}
            >
              <span className="text-xl sm:text-2xl font-semibold shrink-0">{count}</span>
              <span className="text-xs sm:text-sm font-medium leading-tight">
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
