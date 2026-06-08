import { cn } from '@/lib/utils'
import type { ContractStatus } from '@/types/contracts'

const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Borrador',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  pending_approval: {
    label: 'Pendiente de aprobación',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  revision_requested: {
    label: 'Revisión solicitada',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  pending_admin_signature: {
    label: 'Esperando firma de Grandir',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  active: {
    label: 'Activo',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  expired: {
    label: 'Vencido',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

interface ContractStatusBadgeProps {
  status: ContractStatus
  className?: string
}

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
