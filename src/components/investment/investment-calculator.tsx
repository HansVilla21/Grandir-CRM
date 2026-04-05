'use client'

import { useMemo } from 'react'
import { calculateInvestment, type PlanType } from '@/lib/investment/calculator'
import { formatCurrency, formatLongDate } from '@/lib/investment/format'

interface InvestmentCalculatorProps {
  planType: PlanType
  annualRate: number
  amount: number
  termMonths: number
  startDate?: Date
}

export function InvestmentCalculator({
  planType,
  annualRate,
  amount,
  termMonths,
  startDate,
}: InvestmentCalculatorProps) {
  const result = useMemo(
    () => calculateInvestment({ planType, annualRate, amount, termMonths, startDate }),
    [planType, annualRate, amount, termMonths, startDate]
  )

  if (amount <= 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-500">Ingresa un monto para ver tu proyección</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 space-y-5">
      <h3 className="text-sm font-semibold text-zinc-900">Proyección de tu inversión</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500 mb-0.5">Capital invertido</p>
          <p className="text-base font-semibold text-zinc-900">{formatCurrency(result.capital)}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-3 border border-green-100">
          <p className="text-xs text-green-700 mb-0.5">Rendimiento</p>
          <p className="text-base font-semibold text-green-800">+{formatCurrency(result.totalReturn)}</p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-400 mb-0.5">Total a recibir</p>
          <p className="text-base font-semibold text-white">{formatCurrency(result.totalPayout)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 border-y border-zinc-100">
        <span className="text-sm text-zinc-600">Fecha de vencimiento</span>
        <span className="text-sm font-medium text-zinc-900">{formatLongDate(result.endDate)}</span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          Cronograma de pagos
        </h4>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {result.schedule.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-zinc-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500">{formatLongDate(item.date)}</p>
                <p className="text-xs text-zinc-700 truncate">{item.description}</p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  item.type === 'final_payout' ? 'text-zinc-900' : 'text-green-700'
                }`}
              >
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
