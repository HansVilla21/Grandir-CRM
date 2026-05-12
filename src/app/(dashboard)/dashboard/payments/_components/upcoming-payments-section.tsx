'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UpcomingPayment } from '@/lib/investment/upcoming-payments'

interface UpcomingPaymentsSectionProps {
  onRegisterPayment?: (contractId: string, suggestedAmount: number) => void
}

interface ApiResponse {
  items: UpcomingPayment[]
  summary: {
    overdue: number
    thisMonth: number
    upcoming: number
    paid: number
    pendingAmount: number
    thisMonthAmount: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'))
}

const STATUS_CONFIG: Record<
  UpcomingPayment['status'],
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  overdue: {
    label: 'Atrasado',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  this_month: {
    label: 'Este mes',
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: Calendar,
  },
  upcoming: {
    label: 'Próximo',
    badgeClass: 'bg-zinc-50 text-zinc-600 border-zinc-200',
    icon: Clock,
  },
  paid: {
    label: 'Pagado',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
}

type FilterStatus = 'pending' | 'this_month' | 'overdue' | 'all'

export function UpcomingPaymentsSection({ onRegisterPayment }: UpcomingPaymentsSectionProps) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('pending')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/payments/upcoming')
        const json = await res.json()
        if (!cancelled) {
          if (!res.ok) {
            setError(json.error ?? 'Error al cargar próximos pagos')
            return
          }
          setData(json)
        }
      } catch {
        if (!cancelled) setError('Error de conexión')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    if (filter === 'all') return data.items
    if (filter === 'pending') {
      return data.items.filter((i) => i.status === 'overdue' || i.status === 'this_month')
    }
    return data.items.filter((i) => i.status === filter)
  }, [data, filter])

  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
        <p className="text-sm text-zinc-500">Calculando próximos pagos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!data) return null

  const { summary } = data

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Atrasados"
          count={summary.overdue}
          accent="red"
          icon={AlertCircle}
        />
        <SummaryCard
          label="Este mes"
          count={summary.thisMonth}
          accent="yellow"
          icon={Calendar}
          amount={summary.thisMonthAmount}
        />
        <SummaryCard
          label="Total pendiente"
          count={summary.overdue + summary.thisMonth}
          accent="zinc"
          icon={Clock}
          amount={summary.pendingAmount}
        />
      </div>

      {/* Table card */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Próximos desembolsos</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cronograma calculado automáticamente desde los contratos activos
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-0.5 text-xs">
            <FilterButton current={filter} value="pending" label="Pendientes" onClick={setFilter} />
            <FilterButton current={filter} value="this_month" label="Este mes" onClick={setFilter} />
            <FilterButton current={filter} value="overdue" label="Atrasados" onClick={setFilter} />
            <FilterButton current={filter} value="all" label="Todos" onClick={setFilter} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">
            No hay pagos en este estado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Inversionista
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Fecha esperada
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Estado
                  </th>
                  {onRegisterPayment && (
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Acción
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((item, idx) => {
                  const config = STATUS_CONFIG[item.status]
                  const Icon = config.icon
                  return (
                    <tr key={`${item.contract_id}-${item.scheduled_date}-${idx}`}>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {item.holder_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{item.plan_name}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDate(item.scheduled_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                        {formatCurrency(item.expected_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border',
                            config.badgeClass
                          )}
                        >
                          <Icon size={11} />
                          {config.label}
                        </span>
                      </td>
                      {onRegisterPayment && (
                        <td className="px-4 py-3 text-right">
                          {item.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() =>
                                onRegisterPayment(item.contract_id, item.expected_amount)
                              }
                              className="text-xs font-medium text-green-700 hover:text-green-800 hover:underline"
                            >
                              Registrar pago
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterButton({
  current,
  value,
  label,
  onClick,
}: {
  current: FilterStatus
  value: FilterStatus
  label: string
  onClick: (v: FilterStatus) => void
}) {
  const isActive = current === value
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
        isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
      )}
    >
      {label}
    </button>
  )
}

function SummaryCard({
  label,
  count,
  accent,
  icon: Icon,
  amount,
}: {
  label: string
  count: number
  accent: 'red' | 'yellow' | 'zinc'
  icon: typeof AlertCircle
  amount?: number
}) {
  const accentClasses: Record<typeof accent, string> = {
    red: 'text-red-600 bg-red-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    zinc: 'text-zinc-600 bg-zinc-50',
  }
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
        <div className={cn('rounded-md p-1.5', accentClasses[accent])}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-zinc-900">{count}</p>
      {amount !== undefined && (
        <p className="text-xs text-zinc-500 mt-1">{formatCurrency(amount)}</p>
      )}
    </div>
  )
}
