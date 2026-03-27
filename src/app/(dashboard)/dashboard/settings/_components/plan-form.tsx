'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { Tables } from '@/types/database'

type InvestmentPlan = Tables<'investment_plans'>
type PlanType = 'annual' | 'monthly' | 'semestral'

interface PlanFormProps {
  plan?: InvestmentPlan
  onClose: () => void
}

const PAYMENT_NOTES: Record<PlanType, string> = {
  annual: 'Pago único al vencimiento.',
  monthly: 'Estructura de pagos: 10% mensual desde mes 3, resto al vencimiento.',
  semestral: 'Estructura de pagos: 40% semestral, resto al vencimiento.',
}

export function PlanForm({ plan, onClose }: PlanFormProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isEdit = !!plan

  const [name, setName] = useState(plan?.name ?? '')
  const [type, setType] = useState<PlanType>((plan?.type as PlanType) ?? 'annual')
  const [annualRate, setAnnualRate] = useState(plan?.annual_rate?.toString() ?? '')
  const [minAmount, setMinAmount] = useState(plan?.min_amount?.toString() ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [validFrom, setValidFrom] = useState(
    plan?.valid_from ? plan.valid_from.split('T')[0] : ''
  )
  const [validTo, setValidTo] = useState(
    plan?.valid_to ? plan.valid_to.split('T')[0] : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    const rate = parseFloat(annualRate)
    const amount = parseFloat(minAmount)

    if (isNaN(rate) || rate <= 0) {
      setError('La tasa anual debe ser un número positivo')
      return
    }

    if (isNaN(amount) || amount <= 0) {
      setError('El monto mínimo debe ser un número positivo')
      return
    }

    setLoading(true)

    try {
      let res: Response

      if (isEdit) {
        res = await fetch(`/api/settings/plans/${plan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            annual_rate: rate,
            min_amount: amount,
            description: description.trim() || null,
            valid_from: validFrom || null,
            valid_to: validTo || null,
          }),
        })
      } else {
        res = await fetch('/api/settings/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            type,
            annual_rate: rate,
            min_amount: amount,
            description: description.trim() || undefined,
            valid_from: validFrom || undefined,
            valid_to: validTo || undefined,
          }),
        })
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error inesperado')
        return
      }

      router.refresh()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <dialog
        ref={dialogRef}
        open
        className="relative w-full max-w-lg rounded-t-xl sm:rounded-xl bg-white p-4 sm:p-6 shadow-xl m-0 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-900">
            {isEdit ? 'Editar plan' : 'Nuevo plan de inversión'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Nombre del plan
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Plan Mensual 2026"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
            />
          </div>

          {/* Tipo — solo en modo crear */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Tipo de plan
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlanType)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors bg-white"
              >
                <option value="annual">Anual</option>
                <option value="monthly">Mensual</option>
                <option value="semestral">Semestral</option>
              </select>
              {/* Nota de estructura de pagos */}
              <p className="mt-1.5 text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">
                {PAYMENT_NOTES[type]}
              </p>
            </div>
          )}

          {/* Tasa anual y monto mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Tasa anual (%)
              </label>
              <input
                type="number"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                placeholder="120"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Monto mínimo ($)
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="1000"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Descripción{' '}
              <span className="text-zinc-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del plan..."
              rows={2}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors resize-none"
            />
          </div>

          {/* Vigencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Válido desde{' '}
                <span className="text-zinc-400 font-normal">(opcional)</span>
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Válido hasta{' '}
                <span className="text-zinc-400 font-normal">(opcional)</span>
              </label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear plan'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
