'use client'

import { Check } from 'lucide-react'
import { formatCurrency } from '@/lib/investment/format'

export interface PlanOption {
  id: string
  name: string
  type: 'annual' | 'monthly' | 'semestral'
  annual_rate: number
  min_amount: number
  description: string | null
}

interface PlanSelectorProps {
  plans: PlanOption[]
  selectedId: string | null
  onSelect: (planId: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  annual: 'Anual',
  monthly: 'Mensual',
  semestral: 'Semestral',
}

export function PlanSelector({ plans, selectedId, onSelect }: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isSelected = selectedId === plan.id
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={`relative text-left rounded-xl border-2 p-5 transition-all ${
              isSelected
                ? 'border-green-500 bg-green-50 shadow-sm'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}

            <div className="mb-3">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Plan {TYPE_LABELS[plan.type] ?? plan.type}
              </p>
              <h3 className="text-lg font-semibold text-zinc-900 mt-0.5">{plan.name}</h3>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-500">Rendimiento</span>
                <span className="text-xl font-bold text-green-700">{plan.annual_rate}%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-500">Monto mínimo</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {formatCurrency(plan.min_amount)}
                </span>
              </div>
            </div>

            {plan.description && (
              <p className="text-xs text-zinc-600 leading-relaxed pt-3 border-t border-zinc-100">
                {plan.description}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
