'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UpcomingPayment } from '@/lib/investment/upcoming-payments'

interface ApiResponse {
  items: UpcomingPayment[]
  summary: {
    overdue: number
    thisMonth: number
    pendingAmount: number
    thisMonthAmount: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'))
}

export function UpcomingPaymentsWidget() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/payments/upcoming')
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
        <p className="text-sm text-zinc-500">Calculando próximos pagos...</p>
      </div>
    )
  }

  if (!data) return null

  const pending = data.items.filter(
    (i) => i.status === 'overdue' || i.status === 'this_month'
  )
  const top5 = pending.slice(0, 5)
  const hasOverdue = data.summary.overdue > 0

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Calendar size={14} className="text-zinc-400" />
            Próximos pagos
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {data.summary.thisMonth + data.summary.overdue} pendiente
            {data.summary.thisMonth + data.summary.overdue !== 1 ? 's' : ''} ·{' '}
            {formatCurrency(data.summary.pendingAmount)}
          </p>
        </div>
        <Link
          href="/dashboard/payments"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-0.5"
        >
          Ver todos
          <ChevronRight size={14} />
        </Link>
      </div>

      {hasOverdue && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-center gap-2 text-xs">
          <AlertCircle size={13} className="text-red-600 shrink-0" />
          <span className="text-red-700">
            {data.summary.overdue} pago{data.summary.overdue !== 1 ? 's' : ''} atrasado
            {data.summary.overdue !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {top5.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-6">
          No hay pagos pendientes este mes
        </p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {top5.map((item, idx) => (
            <div
              key={`${item.contract_id}-${item.scheduled_date}-${idx}`}
              className="py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {item.holder_name ?? '—'}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {item.plan_name} · {formatDate(item.scheduled_date)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-zinc-900">
                  {formatCurrency(item.expected_amount)}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    item.status === 'overdue' ? 'text-red-600' : 'text-yellow-700'
                  )}
                >
                  {item.status === 'overdue' ? 'Atrasado' : 'Este mes'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending.length > 5 && (
        <Link
          href="/dashboard/payments"
          className="mt-3 block text-center text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          + {pending.length - 5} más
        </Link>
      )}
    </div>
  )
}
