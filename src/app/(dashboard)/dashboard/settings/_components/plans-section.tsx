'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'
import { PlanForm } from './plan-form'
import type { Tables } from '@/types/database'

type InvestmentPlan = Tables<'investment_plans'>

interface PlansSectionProps {
  plans: InvestmentPlan[]
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  annual: 'Anual',
  monthly: 'Mensual',
  semestral: 'Semestral',
}

export function PlansSection({ plans }: PlansSectionProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | undefined>(undefined)
  const [toggling, setToggling] = useState<string | null>(null)

  async function handleToggleActive(plan: InvestmentPlan) {
    setToggling(plan.id)
    try {
      await fetch(`/api/settings/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !plan.active }),
      })
      router.refresh()
    } finally {
      setToggling(null)
    }
  }

  function openCreate() {
    setEditingPlan(undefined)
    setShowForm(true)
  }

  function openEdit(plan: InvestmentPlan) {
    setEditingPlan(plan)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingPlan(undefined)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Planes de inversión</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Configuración de planes disponibles para contratos</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={14} />
          Nuevo plan
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Tasa anual</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Mínimo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Vigencia</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-zinc-400">
                  No hay planes configurados
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-zinc-50/60 transition-colors">
                <td className="px-4 py-3 text-zinc-900 font-medium">{plan.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                    {PLAN_TYPE_LABELS[plan.type] ?? plan.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-700 tabular-nums">{plan.annual_rate}%</td>
                <td className="px-4 py-3 text-zinc-700 tabular-nums">
                  ${plan.min_amount.toLocaleString('en-US')}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {plan.valid_from || plan.valid_to
                    ? `${formatDate(plan.valid_from)} → ${formatDate(plan.valid_to)}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {/* Toggle activo/inactivo inline */}
                  <button
                    onClick={() => handleToggleActive(plan)}
                    disabled={toggling === plan.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                      plan.active ? 'bg-zinc-900' : 'bg-zinc-300'
                    }`}
                    title={plan.active ? 'Desactivar plan' : 'Activar plan'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        plan.active ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(plan)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PlanForm plan={editingPlan} onClose={closeForm} />
      )}
    </section>
  )
}
